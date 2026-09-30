import { moveNotation, moveToIccs, iccsToMove } from './notation';
import { Position } from './position';
import {
  CANNON,
  CHARIOT,
  HORSE,
  INITIAL_FEN,
  PIECE_NAMES,
  RED,
  SOLDIER,
  encodeMove,
  hasCrossedRiver,
  moveFrom,
  moveTo,
  rowOf,
  sideName,
  type Move,
  type PieceName,
  type PieceType,
  type Side,
} from './types';

export type SideName = 'red' | 'black';

export type EndReason =
  | 'checkmate'
  | 'stalemate'
  | 'perpetual_check'
  | 'repetition'
  | 'move_limit'
  | 'insufficient_material'
  | 'resign'
  | 'timeout'
  | 'draw_agreed'
  | 'abandon';

export interface GameResult {
  /** 'draw' khi hòa */
  winner: SideName | 'draw';
  reason: EndReason;
}

export type GameEvent =
  | { type: 'move'; side: SideName; piece: PieceName; from: number; to: number }
  | { type: 'capture'; side: SideName; piece: PieceName; at: number }
  | { type: 'check'; side: SideName; by: PieceName[]; checkers: number[]; kingSquare: number; double: boolean }
  | { type: 'soldierCrossed'; side: SideName; at: number }
  | { type: 'checkmate'; side: SideName; by: PieceName[] }
  | { type: 'perpetualCheckWarning'; side: SideName; count: number; max: number }
  | { type: 'reveal'; side: SideName; piece: PieceName; at: number }
  | { type: 'gameEnd'; result: GameResult };

export type Variant = 'xiangqi' | 'jieqi';

export interface MoveRecord {
  move: Move;
  iccs: string;
  vi: string;
  wxf: string;
  side: SideName;
  piece: PieceName;
  captured: PieceName | null;
  check: boolean;
  /** khóa thế cờ SAU nước đi */
  key: string;
  /** Cờ úp: quân vừa lật (null nếu quân đã lật từ trước) */
  reveal?: PieceName | null;
  /** Cờ úp: quân bị ăn là quân úp */
  capturedHidden?: boolean;
}

export interface GameOptions {
  variant?: Variant;
  /** Cờ úp: mã quân thật cho từng ô (0 = chưa biết). Bỏ trống → không biết (phía client). */
  identity?: Int8Array | null;
}

const PIECE_CHAR: Record<PieceName, string> = {
  king: 'k',
  advisor: 'a',
  elephant: 'b',
  horse: 'n',
  chariot: 'r',
  cannon: 'c',
  soldier: 'p',
};
const CHAR_TYPE: Record<string, number> = { k: 1, a: 2, b: 3, n: 4, r: 5, c: 6, p: 7 };

/** Tách nước ICCS có chú thích cờ úp: "a0a5=nxr" (lật thành Mã, ăn quân úp là Xe) */
export function parseAnnotatedMove(s: string): { iccs: string; reveal: number | null; capture: number | null } {
  const m = s.trim().toLowerCase().match(/^([a-i][0-9][a-i][0-9])(?:=([kabnrcp]))?(?:x([kabnrcp]))?$/);
  if (!m) throw new Error(`Nước đi không hợp lệ: ${s}`);
  return { iccs: m[1]!, reveal: m[2] ? CHAR_TYPE[m[2]]! : null, capture: m[3] ? CHAR_TYPE[m[3]]! : null };
}

/** Xáo quân cho cờ úp: trả về identity 90 ô (chỉ các ô xuất phát có quân khác Tướng) */
export function shuffleJieqi(rng: () => number = Math.random): Int8Array {
  const pos = Position.fromFen(INITIAL_FEN);
  const identity = new Int8Array(90);
  for (const side of [1, -1]) {
    const squares: number[] = [];
    const pieces: number[] = [];
    for (let s = 0; s < 90; s++) {
      const p = pos.board[s]!;
      if (p !== 0 && Math.sign(p) === side && Math.abs(p) !== 1) {
        squares.push(s);
        pieces.push(p);
      }
    }
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j]!, pieces[i]!];
    }
    squares.forEach((s, i) => (identity[s] = pieces[i]!));
  }
  return identity;
}

export interface PlayResult {
  ok: true;
  record: MoveRecord;
  events: GameEvent[];
}

export interface PlayError {
  ok: false;
  error: string;
}

/** Số lần lặp thế cờ trong chuỗi chiếu mãi thì bị xử thua (lần 2 cảnh báo). */
export const PERPETUAL_MAX = 3;
/** 60 nước (120 nửa nước) không ăn quân → hòa */
export const MOVE_LIMIT_PLIES = 120;

/**
 * Ván cờ: giữ thế cờ, lịch sử, luật kết thúc (chiếu bí, hết nước, chiếu mãi, lặp nước, 60 nước, thiếu quân).
 * Kết thúc do người (đầu hàng, hết giờ, hòa thỏa thuận) đặt bằng setResult().
 */
export class Game {
  readonly startFen: string;
  readonly variant: Variant;
  pos: Position;
  private readonly initial: Position;
  records: MoveRecord[] = [];
  /** keys[i] = khóa thế cờ sau i nửa nước (keys[0] = thế đầu) */
  keys: string[] = [];
  result: GameResult | null = null;
  /** Cảnh báo chiếu mãi hiện hành (nếu có) */
  perpetualWarning: { side: SideName; count: number } | null = null;

  constructor(fen: string = INITIAL_FEN, opts: GameOptions = {}) {
    this.startFen = fen;
    this.variant = opts.variant ?? 'xiangqi';
    this.pos = Position.fromFen(fen);
    if (this.variant === 'jieqi') {
      const hidden = new Uint8Array(90);
      for (let s = 0; s < 90; s++) {
        const p = this.pos.board[s]!;
        if (p !== 0 && Math.abs(p) !== 1) hidden[s] = 1;
      }
      this.pos.hidden = hidden;
      this.pos.identity = opts.identity ? opts.identity.slice() : new Int8Array(90);
      this.pos.relaxed = true;
    }
    this.initial = this.pos.clone();
    this.keys = [this.pos.key()];
    this.evaluateStatic();
  }

  static fromMoves(fen: string, moves: string[], opts: GameOptions = {}): Game {
    const g = new Game(fen, opts);
    for (const s of moves) {
      const r = g.playIccs(s);
      if (!r.ok) throw new Error(`Nước không hợp lệ trong lịch sử: ${s} (${r.error})`);
    }
    return g;
  }

  /** Ván cờ úp mới với quân đã xáo */
  static newJieqi(rng?: () => number): Game {
    return new Game(INITIAL_FEN, { variant: 'jieqi', identity: shuffleJieqi(rng) });
  }

  /** Nước đi kèm chú thích lật quân (cờ úp) để dựng lại ván ở nơi không biết danh tính quân */
  annotated(r: MoveRecord): string {
    if (this.variant !== 'jieqi') return r.iccs;
    let s = r.iccs;
    if (r.reveal) s += `=${PIECE_CHAR[r.reveal]}`;
    if (r.capturedHidden && r.captured) s += `x${PIECE_CHAR[r.captured]}`;
    return s;
  }

  /** Cờ úp: ô s còn úp không */
  isHidden(s: number): boolean {
    return !!this.pos.hidden?.[s];
  }

  get turn(): SideName {
    return sideName(this.pos.side);
  }

  get ply(): number {
    return this.records.length;
  }

  fen(): string {
    return this.pos.toFen();
  }

  movesIccs(): string[] {
    return this.records.map((r) => this.annotated(r));
  }

  legalMoves(): Move[] {
    if (this.result) return [];
    return this.pos.legalMoves();
  }

  legalMovesFrom(sq: number): Move[] {
    if (this.result) return [];
    return this.pos.legalMovesFrom(sq);
  }

  inCheck(): boolean {
    return this.pos.inCheck(this.pos.side);
  }

  play(from: number, to: number): PlayResult | PlayError {
    return this.playMove(encodeMove(from, to));
  }

  playIccs(iccs: string): PlayResult | PlayError {
    try {
      if (iccs.length > 4) {
        const a = parseAnnotatedMove(iccs);
        const m = iccsToMove(a.iccs);
        return this.playMove(m, a.reveal, a.capture);
      }
      return this.playMove(iccsToMove(iccs));
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /**
   * Đi nước m. Cờ úp phía client: truyền `reveal` (loại quân lật ra) và `capture` (loại quân úp bị ăn)
   * do server cung cấp.
   */
  playMove(m: Move, reveal: number | null = null, capture: number | null = null): PlayResult | PlayError {
    if (this.result) return { ok: false, error: 'Ván cờ đã kết thúc' };
    const pos = this.pos;
    const from = moveFrom(m);
    const to = moveTo(m);
    const piece = pos.board[from]!;
    if (piece === 0) return { ok: false, error: 'Không có quân ở ô xuất phát' };
    if ((piece > 0 ? RED : -1) !== pos.side) return { ok: false, error: 'Chưa tới lượt bên này' };
    if (!pos.legalMovesFrom(from).includes(m)) return { ok: false, error: 'Nước đi không hợp lệ' };

    const side = pos.side;
    const sName = sideName(side);
    const vi = moveNotation(pos, m, 'vi');
    const wxf = moveNotation(pos, m, 'wxf');
    const wasHidden = !!pos.hidden?.[from];
    const capturedHidden = !!pos.hidden?.[to];
    if (pos.hidden) {
      if (wasHidden && reveal) pos.identity![from] = side * reveal;
      if (capturedHidden && capture) pos.identity![to] = -side * capture;
    }
    const capturedCode = pos.board[to] !== 0 ? pos.trueCode(to) || pos.board[to]! : 0;

    pos.makeMove(m);

    const movedCode = pos.board[to]!;
    const type = Math.abs(movedCode) as PieceType;
    const opp = pos.side;
    const checkers = pos.checkers(opp);
    const record: MoveRecord = {
      move: m,
      iccs: moveToIccs(m),
      vi,
      wxf,
      side: sName,
      piece: PIECE_NAMES[type],
      captured: capturedCode ? PIECE_NAMES[Math.abs(capturedCode) as PieceType] : null,
      check: checkers.length > 0,
      key: pos.key(),
    };
    if (this.variant === 'jieqi') {
      record.reveal = wasHidden ? PIECE_NAMES[type] : null;
      record.capturedHidden = capturedHidden;
    }
    this.records.push(record);
    this.keys.push(record.key);

    const events: GameEvent[] = [{ type: 'move', side: sName, piece: record.piece, from, to }];
    if (record.reveal) events.push({ type: 'reveal', side: sName, piece: record.reveal, at: to });
    if (record.captured) events.push({ type: 'capture', side: sName, piece: record.captured, at: to });
    if (type === SOLDIER && !hasCrossedRiver(side, rowOf(from)) && hasCrossedRiver(side, rowOf(to))) {
      events.push({ type: 'soldierCrossed', side: sName, at: to });
    }
    const checkerTypes = checkers.map((s) => PIECE_NAMES[Math.abs(pos.board[s]!) as PieceType]);
    if (checkers.length > 0) {
      events.push({
        type: 'check',
        side: sName,
        by: checkerTypes,
        checkers,
        kingSquare: pos.kingSquare(opp),
        double: checkers.length > 1,
      });
    }

    this.perpetualWarning = null;
    this.evaluateAfterMove(events, checkerTypes);
    return { ok: true, record, events };
  }

  /** Hoàn tác n nửa nước (xóa kết quả tự động nếu có) */
  undo(n = 1): number {
    let done = 0;
    while (done < n && this.records.length > 0) {
      this.records.pop();
      this.keys.pop();
      this.pos.unmakeMove();
      done++;
    }
    if (done > 0) {
      this.result = null;
      this.perpetualWarning = null;
      this.evaluateStatic();
    }
    return done;
  }

  /** Đặt kết quả do sự kiện ngoài luật (đầu hàng, hết giờ, hòa thỏa thuận, bỏ cuộc) */
  setResult(result: GameResult): void {
    if (!this.result) this.result = result;
  }

  /** Thế cờ tại nửa nước thứ `ply` (0 = thế đầu), dùng cho xem lại */
  positionAt(ply: number): Position {
    const p = this.initial.clone();
    for (let i = 0; i < ply && i < this.records.length; i++) {
      const r = this.records[i]!;
      if (p.hidden && r.reveal) {
        const from = moveFrom(r.move);
        p.identity![from] = (r.side === 'red' ? 1 : -1) * (CHAR_TYPE[PIECE_CHAR[r.reveal]] ?? 0);
      }
      p.makeMove(r.move);
    }
    return p;
  }

  /** Nếu đi nước m thì ván có kết thúc bất lợi cho bên đi vì chiếu mãi không? (AI dùng để tránh) */
  wouldLoseByPerpetual(m: Move): boolean {
    const r = this.playMove(m);
    if (!r.ok) return false;
    const lose = this.result?.reason === 'perpetual_check' && this.result.winner !== r.record.side;
    this.undo(1);
    return lose;
  }

  private evaluateStatic(): void {
    if (this.result) return;
    const pos = this.pos;
    if (!pos.hasLegalMove()) {
      const loser = pos.side;
      this.result = {
        winner: sideName(-loser as Side),
        reason: pos.inCheck(loser) ? 'checkmate' : 'stalemate',
      };
    }
  }

  private evaluateAfterMove(events: GameEvent[], checkerTypes: PieceName[]): void {
    const pos = this.pos;
    const mover = sideName(-pos.side as Side);

    // 1) Hết nước đi: chiếu bí hoặc hết nước (đều thua trong cờ tướng)
    if (!pos.hasLegalMove()) {
      const inCheck = pos.inCheck(pos.side);
      this.result = { winner: mover, reason: inCheck ? 'checkmate' : 'stalemate' };
      if (inCheck) events.push({ type: 'checkmate', side: mover, by: checkerTypes });
      events.push({ type: 'gameEnd', result: this.result });
      return;
    }

    // 2) Lặp thế cờ / chiếu mãi
    const n = this.keys.length - 1;
    const current = this.keys[n]!;
    const occurrences: number[] = [];
    for (let i = 0; i <= n; i++) if (this.keys[i] === current) occurrences.push(i);
    if (occurrences.length >= 2) {
      // Đếm số lần lặp liên tục gần nhất mà trong đó một bên CHỈ toàn đi nước chiếu
      const streak = (side: SideName): number => {
        let count = 1;
        for (let k = occurrences.length - 2; k >= 0; k--) {
          const j = occurrences[k]!;
          let any = false;
          let all = true;
          for (let i = j; i < n; i++) {
            const rec = this.records[i]!;
            if (rec.side !== side) continue;
            any = true;
            if (!rec.check) {
              all = false;
              break;
            }
          }
          if (any && all) count++;
          else break;
        }
        return count;
      };
      const redStreak = streak('red');
      const blackStreak = streak('black');
      let perpetrator: SideName | null = null;
      let count = occurrences.length;
      if (redStreak >= 2 && blackStreak < 2) {
        perpetrator = 'red';
        count = redStreak;
      } else if (blackStreak >= 2 && redStreak < 2) {
        perpetrator = 'black';
        count = blackStreak;
      }

      if (perpetrator) {
        if (count >= PERPETUAL_MAX) {
          this.result = { winner: perpetrator === 'red' ? 'black' : 'red', reason: 'perpetual_check' };
          events.push({ type: 'gameEnd', result: this.result });
          return;
        }
        this.perpetualWarning = { side: perpetrator, count };
        events.push({ type: 'perpetualCheckWarning', side: perpetrator, count, max: PERPETUAL_MAX });
      } else if (occurrences.length >= 3) {
        this.result = { winner: 'draw', reason: 'repetition' };
        events.push({ type: 'gameEnd', result: this.result });
        return;
      }
    }

    // 3) 60 nước không ăn quân
    if (pos.halfmoveClock >= MOVE_LIMIT_PLIES) {
      this.result = { winner: 'draw', reason: 'move_limit' };
      events.push({ type: 'gameEnd', result: this.result });
      return;
    }

    // 4) Không bên nào còn quân tấn công
    if (!hasAttackingMaterial(pos)) {
      this.result = { winner: 'draw', reason: 'insufficient_material' };
      events.push({ type: 'gameEnd', result: this.result });
    }
  }
}

function hasAttackingMaterial(pos: Position): boolean {
  for (let s = 0; s < 90; s++) {
    const t = Math.abs(pos.board[s]!);
    if (t === CHARIOT || t === HORSE || t === CANNON || t === SOLDIER) return true;
  }
  return false;
}

export const END_REASON_VI: Record<EndReason, string> = {
  checkmate: 'Chiếu bí',
  stalemate: 'Hết nước đi',
  perpetual_check: 'Chiếu mãi',
  repetition: 'Lặp nước',
  move_limit: '60 nước không ăn quân',
  insufficient_material: 'Không đủ lực chiếu bí',
  resign: 'Đầu hàng',
  timeout: 'Hết giờ',
  draw_agreed: 'Hòa thỏa thuận',
  abandon: 'Bỏ cuộc',
};
