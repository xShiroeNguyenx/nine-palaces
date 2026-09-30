/**
 * Quy ước bàn cờ:
 * - 90 ô, chỉ số sq = row * 9 + col.
 * - row 0 là hàng đáy của bên Đen (trên cùng), row 9 là hàng đáy của bên Đỏ (dưới cùng).
 * - col 0 là cột trái nhất khi nhìn từ phía Đỏ.
 * - Sông nằm giữa row 4 và row 5. Đỏ ở row 5..9, Đen ở row 0..4.
 * - Quân mã hóa bằng số: dương = Đỏ, âm = Đen, 0 = trống.
 */

export type Side = 1 | -1;
export const RED: Side = 1;
export const BLACK: Side = -1;

export const KING = 1;
export const ADVISOR = 2;
export const ELEPHANT = 3;
export const HORSE = 4;
export const CHARIOT = 5;
export const CANNON = 6;
export const SOLDIER = 7;

export type PieceType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type PieceName = 'king' | 'advisor' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'soldier';

export const PIECE_NAMES: Record<PieceType, PieceName> = {
  1: 'king',
  2: 'advisor',
  3: 'elephant',
  4: 'horse',
  5: 'chariot',
  6: 'cannon',
  7: 'soldier',
};

/** Nước đi mã hóa: from << 8 | to */
export type Move = number;

export const ROWS = 10;
export const COLS = 9;
export const NUM_SQUARES = 90;

export const sq = (row: number, col: number): number => row * 9 + col;
export const rowOf = (s: number): number => (s / 9) | 0;
export const colOf = (s: number): number => s % 9;
export const inBoard = (row: number, col: number): boolean => row >= 0 && row < 10 && col >= 0 && col < 9;

export const encodeMove = (from: number, to: number): Move => (from << 8) | to;
export const moveFrom = (m: Move): number => m >> 8;
export const moveTo = (m: Move): number => m & 255;

export const pieceType = (p: number): PieceType => Math.abs(p) as PieceType;
export const pieceSide = (p: number): Side => (p > 0 ? RED : BLACK);

export const sideName = (s: Side): 'red' | 'black' => (s === RED ? 'red' : 'black');
export const sideFromName = (n: 'red' | 'black'): Side => (n === 'red' ? RED : BLACK);

export const INITIAL_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';

/** Ô có nằm trong cửu cung của bên side không */
export function inPalace(side: Side, row: number, col: number): boolean {
  if (col < 3 || col > 5) return false;
  return side === RED ? row >= 7 && row <= 9 : row >= 0 && row <= 2;
}

/** Ô có nằm trên phần sân của bên side không */
export function onOwnSide(side: Side, row: number): boolean {
  return side === RED ? row >= 5 : row <= 4;
}

/** Tốt của bên side đã qua sông chưa */
export function hasCrossedRiver(side: Side, row: number): boolean {
  return side === RED ? row <= 4 : row >= 5;
}
