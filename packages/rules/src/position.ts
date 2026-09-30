import {
  ADVISOR,
  BLACK,
  CANNON,
  CHARIOT,
  ELEPHANT,
  HORSE,
  INITIAL_FEN,
  KING,
  RED,
  SOLDIER,
  colOf,
  encodeMove,
  hasCrossedRiver,
  inBoard,
  inPalace,
  moveFrom,
  moveTo,
  onOwnSide,
  rowOf,
  type Move,
  type Side,
} from './types';
import { SIDE_HI, SIDE_LO, ZOBRIST_HI, ZOBRIST_LO, zIndex } from './zobrist';

const ORTHO: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIAG1: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const HORSE_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-2, -1],
  [-2, 1],
  [2, -1],
  [2, 1],
  [-1, -2],
  [1, -2],
  [-1, 2],
  [1, 2],
];

const FEN_TO_PIECE: Record<string, number> = {
  k: KING,
  a: ADVISOR,
  b: ELEPHANT,
  e: ELEPHANT,
  n: HORSE,
  h: HORSE,
  r: CHARIOT,
  c: CANNON,
  p: SOLDIER,
};
const PIECE_TO_FEN = ['', 'k', 'a', 'b', 'n', 'r', 'c', 'p'];

interface Undo {
  move: Move;
  captured: number;
  halfmoveClock: number;
  fullmove: number;
  /** Cờ úp: mã quân ở ô xuất phát trước khi lật */
  origPiece?: number;
  hiddenFrom?: number;
  hiddenTo?: number;
  idFrom?: number;
  idTo?: number;
}

export class Position {
  board = new Int8Array(90);
  side: Side = RED;
  /** Số nửa nước liên tiếp không ăn quân */
  halfmoveClock = 0;
  fullmove = 1;
  hashLo = 0;
  hashHi = 0;
  /** kings[0] = Đỏ, kings[1] = Đen */
  kings: [number, number] = [-1, -1];
  private undoStack: Undo[] = [];
  /** Lịch sử hash (dùng phát hiện lặp trong tìm kiếm) */
  hashHistoryLo: number[] = [];
  hashHistoryHi: number[] = [];

  /**
   * Cờ úp (Jieqi):
   * - `hidden[s] = 1`: quân úp. Mã quân trên `board` là loại quân theo VỊ TRÍ xuất phát (quân úp đi theo vị trí).
   * - `identity[s]`: mã quân thật (0 = chưa biết, ví dụ phía client trước khi server báo).
   * - `relaxed`: Sĩ/Tượng đã lật được đi tự do (ra khỏi cung, qua sông).
   */
  hidden: Uint8Array | null = null;
  identity: Int8Array | null = null;
  relaxed = false;

  static fromFen(fen: string = INITIAL_FEN): Position {
    const pos = new Position();
    pos.loadFen(fen);
    return pos;
  }

  clone(): Position {
    const p = new Position();
    p.board.set(this.board);
    p.side = this.side;
    p.halfmoveClock = this.halfmoveClock;
    p.fullmove = this.fullmove;
    p.hashLo = this.hashLo;
    p.hashHi = this.hashHi;
    p.kings = [this.kings[0], this.kings[1]];
    p.hashHistoryLo = this.hashHistoryLo.slice();
    p.hashHistoryHi = this.hashHistoryHi.slice();
    p.hidden = this.hidden ? this.hidden.slice() : null;
    p.identity = this.identity ? this.identity.slice() : null;
    p.relaxed = this.relaxed;
    return p;
  }

  /** Mã quân thật ở ô s (cờ úp: identity nếu biết, ngược lại mã trên bàn) */
  trueCode(s: number): number {
    if (this.hidden && this.hidden[s]) return this.identity![s] || 0;
    return this.board[s]!;
  }

  loadFen(fen: string): void {
    const parts = fen.trim().split(/\s+/);
    const rows = (parts[0] ?? '').split('/');
    if (rows.length !== 10) throw new Error(`FEN không hợp lệ (cần 10 hàng): ${fen}`);
    this.board.fill(0);
    this.kings = [-1, -1];
    for (let r = 0; r < 10; r++) {
      let c = 0;
      for (const ch of rows[r]!) {
        if (ch >= '1' && ch <= '9') {
          c += Number(ch);
          continue;
        }
        const t = FEN_TO_PIECE[ch.toLowerCase()];
        if (!t) throw new Error(`Ký tự quân không hợp lệ '${ch}' trong FEN`);
        if (c > 8) throw new Error(`Hàng ${r} quá dài trong FEN`);
        const isRed = ch === ch.toUpperCase();
        this.board[r * 9 + c] = isRed ? t : -t;
        if (t === KING) this.kings[isRed ? 0 : 1] = r * 9 + c;
        c++;
      }
      if (c !== 9) throw new Error(`Hàng ${r} không đủ 9 cột trong FEN`);
    }
    if (this.kings[0] < 0 || this.kings[1] < 0) throw new Error('FEN thiếu Tướng');
    const s = (parts[1] ?? 'w').toLowerCase();
    this.side = s === 'b' ? BLACK : RED;
    this.halfmoveClock = Number(parts[4] ?? 0) || 0;
    this.fullmove = Number(parts[5] ?? 1) || 1;
    this.undoStack = [];
    this.recomputeHash();
    this.hashHistoryLo = [];
    this.hashHistoryHi = [];
  }

  toFen(): string {
    const rows: string[] = [];
    for (let r = 0; r < 10; r++) {
      let row = '';
      let empty = 0;
      for (let c = 0; c < 9; c++) {
        const p = this.board[r * 9 + c]!;
        if (p === 0) {
          empty++;
          continue;
        }
        if (empty) {
          row += empty;
          empty = 0;
        }
        const ch = PIECE_TO_FEN[Math.abs(p)]!;
        row += p > 0 ? ch.toUpperCase() : ch;
      }
      if (empty) row += empty;
      rows.push(row);
    }
    return `${rows.join('/')} ${this.side === RED ? 'w' : 'b'} - - ${this.halfmoveClock} ${this.fullmove}`;
  }

  /** Khóa thế cờ (bàn + bên đi) dùng cho luật lặp nước */
  key(): string {
    return `${(this.hashHi >>> 0).toString(36)}.${(this.hashLo >>> 0).toString(36)}`;
  }

  private recomputeHash(): void {
    let lo = 0;
    let hi = 0;
    for (let s = 0; s < 90; s++) {
      const p = this.board[s]!;
      if (p !== 0) {
        lo ^= ZOBRIST_LO[zIndex(p, s)]!;
        hi ^= ZOBRIST_HI[zIndex(p, s)]!;
      }
    }
    if (this.side === BLACK) {
      lo ^= SIDE_LO;
      hi ^= SIDE_HI;
    }
    this.hashLo = lo;
    this.hashHi = hi;
  }

  kingSquare(side: Side): number {
    return this.kings[side === RED ? 0 : 1];
  }

  makeMove(m: Move): void {
    const from = moveFrom(m);
    const to = moveTo(m);
    const b = this.board;
    const orig = b[from]!;
    let piece = orig;
    const captured = b[to]!;
    const undo: Undo = { move: m, captured, halfmoveClock: this.halfmoveClock, fullmove: this.fullmove };
    if (this.hidden) {
      const hid = this.hidden;
      const ids = this.identity!;
      undo.origPiece = orig;
      undo.hiddenFrom = hid[from]!;
      undo.hiddenTo = hid[to]!;
      undo.idFrom = ids[from]!;
      undo.idTo = ids[to]!;
      // Lật quân: nếu chưa biết danh tính (client đang thử nước) thì giữ tạm loại theo vị trí
      if (hid[from]) piece = ids[from] || orig;
      hid[from] = 0;
      hid[to] = 0;
      ids[to] = piece;
      ids[from] = 0;
    }
    this.undoStack.push(undo);
    this.hashHistoryLo.push(this.hashLo);
    this.hashHistoryHi.push(this.hashHi);

    let lo = this.hashLo ^ ZOBRIST_LO[zIndex(orig, from)]! ^ ZOBRIST_LO[zIndex(piece, to)]! ^ SIDE_LO;
    let hi = this.hashHi ^ ZOBRIST_HI[zIndex(orig, from)]! ^ ZOBRIST_HI[zIndex(piece, to)]! ^ SIDE_HI;
    if (captured !== 0) {
      lo ^= ZOBRIST_LO[zIndex(captured, to)]!;
      hi ^= ZOBRIST_HI[zIndex(captured, to)]!;
    }
    this.hashLo = lo;
    this.hashHi = hi;

    b[to] = piece;
    b[from] = 0;
    if (piece === KING) this.kings[0] = to;
    else if (piece === -KING) this.kings[1] = to;
    this.halfmoveClock = captured !== 0 ? 0 : this.halfmoveClock + 1;
    if (this.side === BLACK) this.fullmove++;
    this.side = -this.side as Side;
  }

  unmakeMove(): void {
    const u = this.undoStack.pop();
    if (!u) throw new Error('Không còn nước để hoàn tác');
    const from = moveFrom(u.move);
    const to = moveTo(u.move);
    const b = this.board;
    const piece = b[to]!;
    b[from] = u.origPiece ?? piece;
    b[to] = u.captured;
    if (this.hidden && u.origPiece !== undefined) {
      this.hidden[from] = u.hiddenFrom!;
      this.hidden[to] = u.hiddenTo!;
      this.identity![from] = u.idFrom!;
      this.identity![to] = u.idTo!;
    }
    if (piece === KING) this.kings[0] = from;
    else if (piece === -KING) this.kings[1] = from;
    this.halfmoveClock = u.halfmoveClock;
    this.fullmove = u.fullmove;
    this.side = -this.side as Side;
    this.hashLo = this.hashHistoryLo.pop()!;
    this.hashHi = this.hashHistoryHi.pop()!;
  }

  /** Nước "bỏ lượt" dùng cho null-move pruning trong AI */
  makeNull(): void {
    this.undoStack.push({ move: 0, captured: 0, halfmoveClock: this.halfmoveClock, fullmove: this.fullmove });
    this.hashHistoryLo.push(this.hashLo);
    this.hashHistoryHi.push(this.hashHi);
    this.hashLo ^= SIDE_LO;
    this.hashHi ^= SIDE_HI;
    this.side = -this.side as Side;
  }

  unmakeNull(): void {
    const u = this.undoStack.pop()!;
    this.halfmoveClock = u.halfmoveClock;
    this.fullmove = u.fullmove;
    this.side = -this.side as Side;
    this.hashLo = this.hashHistoryLo.pop()!;
    this.hashHi = this.hashHistoryHi.pop()!;
  }

  /** Tướng của side có đang bị chiếu không (bao gồm luật lộ mặt tướng) */
  inCheck(side: Side): boolean {
    const k = this.kingSquare(side);
    if (isKingAttacked(this.board, k, -side as Side)) return true;
    return this.relaxed && relaxedDefenderAttacks(this, k, -side as Side).length > 0;
  }

  /** Danh sách ô của các quân đang chiếu Tướng bên side */
  checkers(side: Side): number[] {
    const k = this.kingSquare(side);
    const res = kingAttackers(this.board, k, -side as Side);
    if (this.relaxed) res.push(...relaxedDefenderAttacks(this, k, -side as Side));
    return res;
  }

  private isRelaxedPiece(s: number): boolean {
    return this.relaxed && !(this.hidden && this.hidden[s]);
  }

  /** Sinh nước giả hợp lệ (chưa kiểm tra tự chiếu) cho bên đang đi */
  generatePseudo(out: Move[] = [], capturesOnly = false): Move[] {
    const b = this.board;
    const side = this.side;
    for (let s = 0; s < 90; s++) {
      const p = b[s]!;
      if (p === 0 || (p > 0 ? RED : BLACK) !== side) continue;
      genPieceMoves(b, s, p, side, out, capturesOnly, this.isRelaxedPiece(s));
    }
    return out;
  }

  /** Ô sq có bị bên `by` tấn công không (mọi quân, dùng cho phân tích — chậm hơn inCheck) */
  isSquareAttacked(sq: number, by: Side): boolean {
    return this.attackersOf(sq, by).length > 0;
  }

  /** Danh sách ô các quân bên `by` có thể đi tới / ăn ở ô sq (bỏ qua luật tự chiếu) */
  attackersOf(sq: number, by: Side): number[] {
    const b = this.board;
    const saved = b[sq]!;
    // Đặt tạm một quân đối phương để nước "ăn" được sinh ra
    b[sq] = saved !== 0 && (saved > 0 ? RED : BLACK) !== by ? saved : -by * SOLDIER;
    const res: number[] = [];
    const tmp: Move[] = [];
    for (let s = 0; s < 90; s++) {
      const p = b[s]!;
      if (p === 0 || (p > 0 ? RED : BLACK) !== by || s === sq) continue;
      tmp.length = 0;
      genPieceMoves(b, s, p, by, tmp, true, this.isRelaxedPiece(s));
      if (tmp.some((m) => moveTo(m) === sq)) res.push(s);
    }
    b[sq] = saved;
    return res;
  }

  /** Nước đi có hợp lệ về mặt không tự để Tướng bị chiếu hay không (m phải là nước giả hợp lệ) */
  isLegalPseudo(m: Move): boolean {
    const side = this.side;
    this.makeMove(m);
    const ok = !this.inCheck(side);
    this.unmakeMove();
    return ok;
  }

  legalMoves(): Move[] {
    const pseudo = this.generatePseudo();
    const out: Move[] = [];
    for (const m of pseudo) if (this.isLegalPseudo(m)) out.push(m);
    return out;
  }

  legalMovesFrom(from: number): Move[] {
    const p = this.board[from]!;
    if (p === 0 || (p > 0 ? RED : BLACK) !== this.side) return [];
    const pseudo: Move[] = [];
    genPieceMoves(this.board, from, p, this.side, pseudo, false, this.isRelaxedPiece(from));
    return pseudo.filter((m) => this.isLegalPseudo(m));
  }

  hasLegalMove(): boolean {
    const pseudo = this.generatePseudo();
    for (const m of pseudo) if (this.isLegalPseudo(m)) return true;
    return false;
  }

  /** Lặp thế cờ trong phạm vi các nước không ăn quân (dùng cho AI) */
  isRepetition(): boolean {
    const n = this.hashHistoryLo.length;
    const limit = Math.min(this.halfmoveClock, n);
    for (let i = 2; i <= limit; i += 2) {
      if (this.hashHistoryLo[n - i] === this.hashLo && this.hashHistoryHi[n - i] === this.hashHi) return true;
    }
    return false;
  }
}

function pushIfTarget(b: Int8Array, side: Side, from: number, to: number, out: Move[], capturesOnly: boolean) {
  const t = b[to]!;
  if (t === 0) {
    if (!capturesOnly) out.push(encodeMove(from, to));
  } else if ((t > 0 ? RED : BLACK) !== side) {
    out.push(encodeMove(from, to));
  }
}

export function genPieceMoves(
  b: Int8Array,
  s: number,
  p: number,
  side: Side,
  out: Move[],
  capturesOnly: boolean,
  relaxed = false,
): void {
  const r = rowOf(s);
  const c = colOf(s);
  switch (Math.abs(p)) {
    case KING:
      for (const [dr, dc] of ORTHO) {
        const nr = r + dr;
        const nc = c + dc;
        if (inPalace(side, nr, nc)) pushIfTarget(b, side, s, nr * 9 + nc, out, capturesOnly);
      }
      break;
    case ADVISOR:
      for (const [dr, dc] of DIAG1) {
        const nr = r + dr;
        const nc = c + dc;
        if (relaxed ? inBoard(nr, nc) : inPalace(side, nr, nc)) pushIfTarget(b, side, s, nr * 9 + nc, out, capturesOnly);
      }
      break;
    case ELEPHANT:
      for (const [dr, dc] of DIAG1) {
        const nr = r + 2 * dr;
        const nc = c + 2 * dc;
        if (!inBoard(nr, nc) || (!relaxed && !onOwnSide(side, nr))) continue;
        if (b[(r + dr) * 9 + (c + dc)] !== 0) continue; // cản mắt tượng
        pushIfTarget(b, side, s, nr * 9 + nc, out, capturesOnly);
      }
      break;
    case HORSE:
      for (const [dr, dc] of HORSE_DELTAS) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBoard(nr, nc)) continue;
        const legR = Math.abs(dr) === 2 ? r + dr / 2 : r;
        const legC = Math.abs(dc) === 2 ? c + dc / 2 : c;
        if (b[legR * 9 + legC] !== 0) continue; // cản chân mã
        pushIfTarget(b, side, s, nr * 9 + nc, out, capturesOnly);
      }
      break;
    case CHARIOT:
      for (const [dr, dc] of ORTHO) {
        let nr = r + dr;
        let nc = c + dc;
        while (inBoard(nr, nc)) {
          const t = b[nr * 9 + nc]!;
          if (t === 0) {
            if (!capturesOnly) out.push(encodeMove(s, nr * 9 + nc));
          } else {
            if ((t > 0 ? RED : BLACK) !== side) out.push(encodeMove(s, nr * 9 + nc));
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    case CANNON:
      for (const [dr, dc] of ORTHO) {
        let nr = r + dr;
        let nc = c + dc;
        let screen = false;
        while (inBoard(nr, nc)) {
          const t = b[nr * 9 + nc]!;
          if (!screen) {
            if (t === 0) {
              if (!capturesOnly) out.push(encodeMove(s, nr * 9 + nc));
            } else screen = true;
          } else if (t !== 0) {
            if ((t > 0 ? RED : BLACK) !== side) out.push(encodeMove(s, nr * 9 + nc));
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    case SOLDIER: {
      const fwd = side === RED ? -1 : 1;
      if (inBoard(r + fwd, c)) pushIfTarget(b, side, s, (r + fwd) * 9 + c, out, capturesOnly);
      if (hasCrossedRiver(side, r)) {
        if (c > 0) pushIfTarget(b, side, s, r * 9 + c - 1, out, capturesOnly);
        if (c < 8) pushIfTarget(b, side, s, r * 9 + c + 1, out, capturesOnly);
      }
      break;
    }
  }
}

/** Ô k (Tướng) có bị bên `by` tấn công không. Bao gồm luật "lộ mặt tướng". */
export function isKingAttacked(b: Int8Array, k: number, by: Side): boolean {
  const r = rowOf(k);
  const c = colOf(k);
  const rook = by * CHARIOT;
  const cannon = by * CANNON;
  const king = by * KING;
  for (const [dr, dc] of ORTHO) {
    let nr = r + dr;
    let nc = c + dc;
    let screen = false;
    while (inBoard(nr, nc)) {
      const t = b[nr * 9 + nc]!;
      if (t !== 0) {
        if (!screen) {
          if (t === rook) return true;
          if (dc === 0 && t === king) return true;
          screen = true;
        } else {
          if (t === cannon) return true;
          break;
        }
      }
      nr += dr;
      nc += dc;
    }
  }
  const horse = by * HORSE;
  for (const [dr, dc] of HORSE_DELTAS) {
    const hr = r - dr;
    const hc = c - dc;
    if (!inBoard(hr, hc) || b[hr * 9 + hc] !== horse) continue;
    const legR = Math.abs(dr) === 2 ? hr + dr / 2 : hr;
    const legC = Math.abs(dc) === 2 ? hc + dc / 2 : hc;
    if (b[legR * 9 + legC] === 0) return true;
  }
  const soldier = by * SOLDIER;
  const fwd = by === RED ? -1 : 1;
  if (inBoard(r - fwd, c) && b[(r - fwd) * 9 + c] === soldier) return true;
  if (hasCrossedRiver(by, r)) {
    if (c > 0 && b[r * 9 + c - 1] === soldier) return true;
    if (c < 8 && b[r * 9 + c + 1] === soldier) return true;
  }
  return false;
}

/** Cờ úp: Sĩ/Tượng đã lật (đi tự do) có thể chiếu Tướng */
function relaxedDefenderAttacks(pos: Position, k: number, by: Side): number[] {
  const b = pos.board;
  const r = rowOf(k);
  const c = colOf(k);
  const res: number[] = [];
  for (const [dr, dc] of DIAG1) {
    const ar = r + dr;
    const ac = c + dc;
    if (inBoard(ar, ac) && b[ar * 9 + ac] === by * ADVISOR && !(pos.hidden && pos.hidden[ar * 9 + ac])) res.push(ar * 9 + ac);
    const er = r + 2 * dr;
    const ec = c + 2 * dc;
    if (
      inBoard(er, ec) &&
      b[er * 9 + ec] === by * ELEPHANT &&
      !(pos.hidden && pos.hidden[er * 9 + ec]) &&
      b[(r + dr) * 9 + (c + dc)] === 0
    ) {
      res.push(er * 9 + ec);
    }
  }
  return res;
}

/** Như isKingAttacked nhưng trả về danh sách ô quân đang chiếu */
export function kingAttackers(b: Int8Array, k: number, by: Side): number[] {
  const res: number[] = [];
  const r = rowOf(k);
  const c = colOf(k);
  for (const [dr, dc] of ORTHO) {
    let nr = r + dr;
    let nc = c + dc;
    let screen = false;
    while (inBoard(nr, nc)) {
      const s = nr * 9 + nc;
      const t = b[s]!;
      if (t !== 0) {
        if (!screen) {
          if (t === by * CHARIOT) res.push(s);
          else if (dc === 0 && t === by * KING) res.push(s);
          screen = true;
        } else {
          if (t === by * CANNON) res.push(s);
          break;
        }
      }
      nr += dr;
      nc += dc;
    }
  }
  for (const [dr, dc] of HORSE_DELTAS) {
    const hr = r - dr;
    const hc = c - dc;
    if (!inBoard(hr, hc) || b[hr * 9 + hc] !== by * HORSE) continue;
    const legR = Math.abs(dr) === 2 ? hr + dr / 2 : hr;
    const legC = Math.abs(dc) === 2 ? hc + dc / 2 : hc;
    if (b[legR * 9 + legC] === 0) res.push(hr * 9 + hc);
  }
  const fwd = by === RED ? -1 : 1;
  if (inBoard(r - fwd, c) && b[(r - fwd) * 9 + c] === by * SOLDIER) res.push((r - fwd) * 9 + c);
  if (hasCrossedRiver(by, r)) {
    if (c > 0 && b[r * 9 + c - 1] === by * SOLDIER) res.push(r * 9 + c - 1);
    if (c < 8 && b[r * 9 + c + 1] === by * SOLDIER) res.push(r * 9 + c + 1);
  }
  return res;
}
