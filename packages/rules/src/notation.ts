import type { Position } from './position';
import {
  ADVISOR,
  ELEPHANT,
  HORSE,
  RED,
  colOf,
  encodeMove,
  moveFrom,
  moveTo,
  rowOf,
  type Move,
  type PieceType,
  type Side,
} from './types';

const FILES = 'abcdefghi';

/** ICCS: cột a–i từ trái (phía Đỏ), hàng 0–9 từ dưới lên. Ví dụ Pháo đầu: h2e2 */
export function squareToIccs(s: number): string {
  return `${FILES[colOf(s)]}${9 - rowOf(s)}`;
}

export function iccsToSquare(str: string): number {
  const c = FILES.indexOf(str[0]!.toLowerCase());
  const r = 9 - Number(str[1]);
  if (c < 0 || Number.isNaN(r) || r < 0 || r > 9) throw new Error(`Ô ICCS không hợp lệ: ${str}`);
  return r * 9 + c;
}

export function moveToIccs(m: Move): string {
  return squareToIccs(moveFrom(m)) + squareToIccs(moveTo(m));
}

export function iccsToMove(str: string): Move {
  const s = str.replace('-', '').trim();
  if (s.length !== 4) throw new Error(`Nước ICCS không hợp lệ: ${str}`);
  return encodeMove(iccsToSquare(s.slice(0, 2)), iccsToSquare(s.slice(2, 4)));
}

/** Số lộ theo góc nhìn của mỗi bên: Đỏ đánh số 1–9 từ phải sang trái, Đen từ trái sang phải (nhìn từ Đỏ). */
export function fileNumber(side: Side, col: number): number {
  return side === RED ? 9 - col : col + 1;
}

const VI_LETTER: Record<PieceType, string> = { 1: 'Tg', 2: 'S', 3: 'T', 4: 'M', 5: 'X', 6: 'P', 7: 'B' };
const WXF_LETTER: Record<PieceType, string> = { 1: 'K', 2: 'A', 3: 'E', 4: 'H', 5: 'R', 6: 'C', 7: 'P' };

export type NotationStyle = 'vi' | 'wxf';

/**
 * Ký hiệu nước đi. Phải gọi TRƯỚC khi đi nước trên pos.
 * - Tiếng Việt: P2-5 (bình), M8.7 (tấn), X1/1 (thoái); hai quân cùng lộ: Xt.1 / Xs-4.
 * - WXF: C2=5, H8+7, R1-1; hai quân cùng lộ: R+.1 → dùng "+R+1" / "-R=4".
 */
export function moveNotation(pos: Position, m: Move, style: NotationStyle = 'vi'): string {
  const from = moveFrom(m);
  const to = moveTo(m);
  const p = pos.board[from]!;
  if (p === 0) return moveToIccs(m);
  const side: Side = p > 0 ? RED : -1;
  const type = Math.abs(p) as PieceType;
  const col = colOf(from);
  const letter = style === 'vi' ? VI_LETTER[type] : WXF_LETTER[type];

  // Quân cùng loại, cùng bên trên cùng lộ
  const sameFile: number[] = [];
  for (let r = 0; r < 10; r++) if (pos.board[r * 9 + col] === p) sameFile.push(r * 9 + col);

  let prefix: string;
  if (sameFile.length >= 2 && type !== 1 && type !== ADVISOR && type !== ELEPHANT) {
    // Sắp xếp từ trước ra sau theo hướng tiến của bên đó
    sameFile.sort((a, b) => (side === RED ? rowOf(a) - rowOf(b) : rowOf(b) - rowOf(a)));
    const idx = sameFile.indexOf(from);
    if (sameFile.length === 2) {
      prefix = style === 'vi' ? `${letter}${idx === 0 ? 't' : 's'}` : `${idx === 0 ? '+' : '-'}${letter}`;
    } else {
      prefix = style === 'vi' ? `${letter}${idx + 1}` : `${idx + 1}${letter}`;
    }
  } else {
    prefix = `${letter}${fileNumber(side, col)}`;
  }

  const dr = rowOf(to) - rowOf(from);
  const forward = side === RED ? -dr : dr;
  const diagonalMover = type === ADVISOR || type === ELEPHANT || type === HORSE;
  let sym: string;
  let num: number;
  if (dr === 0) {
    sym = style === 'vi' ? '-' : '=';
    num = fileNumber(side, colOf(to));
  } else {
    sym = forward > 0 ? (style === 'vi' ? '.' : '+') : style === 'vi' ? '/' : '-';
    num = diagonalMover ? fileNumber(side, colOf(to)) : Math.abs(dr);
  }
  return `${prefix}${sym}${num}`;
}

/** Tìm nước đi khớp với ký hiệu (vi hoặc wxf hoặc iccs) trong thế cờ hiện tại */
export function parseNotation(pos: Position, text: string): Move | null {
  const t = text.trim();
  if (/^[a-i][0-9]-?[a-i][0-9]$/i.test(t)) {
    const m = iccsToMove(t);
    return pos.legalMoves().includes(m) ? m : null;
  }
  for (const m of pos.legalMoves()) {
    if (moveNotation(pos, m, 'vi') === t || moveNotation(pos, m, 'wxf') === t) return m;
  }
  return null;
}
