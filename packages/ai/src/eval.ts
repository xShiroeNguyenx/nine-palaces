import { ADVISOR, CANNON, CHARIOT, ELEPHANT, HORSE, KING, SOLDIER, type Position } from '@np/rules';

/** Giá trị quân (centipawn) */
export const PIECE_VALUE = [0, 0, 120, 120, 270, 600, 285, 30];

/**
 * Bảng vị trí (PST) nhìn từ phía Đỏ: row 0 là hàng đáy của Đen.
 * Bên Đen dùng bảng lật dọc.
 */
// prettier-ignore
const PST_SOLDIER = [
   0,  3,  6,  9, 12,  9,  6,  3,  0,
  18, 36, 56, 80,120, 80, 56, 36, 18,
  14, 26, 42, 60, 80, 60, 42, 26, 14,
  10, 20, 30, 34, 40, 34, 30, 20, 10,
   6, 12, 18, 18, 20, 18, 18, 12,  6,
   2,  0,  8,  0,  8,  0,  8,  0,  2,
   0,  0, -2,  0,  4,  0, -2,  0,  0,
   0,  0,  0,  0,  0,  0,  0,  0,  0,
   0,  0,  0,  0,  0,  0,  0,  0,  0,
   0,  0,  0,  0,  0,  0,  0,  0,  0,
];
// prettier-ignore
const PST_HORSE = [
   4,  8, 16, 12,  4, 12, 16,  8,  4,
   4, 10, 28, 16,  8, 16, 28, 10,  4,
  12, 14, 16, 20, 18, 20, 16, 14, 12,
   8, 24, 18, 24, 20, 24, 18, 24,  8,
   6, 16, 14, 18, 16, 18, 14, 16,  6,
   4, 12, 16, 14, 12, 14, 16, 12,  4,
   2,  6,  8,  6, 10,  6,  8,  6,  2,
   4,  2,  8,  8,  4,  8,  8,  2,  4,
   0,  2,  4,  4, -2,  4,  4,  2,  0,
   0, -4,  0,  0,  0,  0,  0, -4,  0,
];
// prettier-ignore
const PST_CHARIOT = [
  14, 14, 12, 18, 16, 18, 12, 14, 14,
  16, 20, 18, 24, 26, 24, 18, 20, 16,
  12, 12, 12, 18, 18, 18, 12, 12, 12,
  12, 18, 16, 22, 22, 22, 16, 18, 12,
  12, 14, 12, 18, 18, 18, 12, 14, 12,
  12, 16, 14, 20, 20, 20, 14, 16, 12,
   6, 10,  8, 14, 14, 14,  8, 10,  6,
   4,  8,  6, 14, 12, 14,  6,  8,  4,
   8,  4,  8, 16,  8, 16,  8,  4,  8,
  -2, 10,  6, 14, 12, 14,  6, 10, -2,
];
// prettier-ignore
const PST_CANNON = [
   6,  4,  0,-10,-12,-10,  0,  4,  6,
   2,  2,  0, -4,-14, -4,  0,  2,  2,
   2,  2,  0,-10, -8,-10,  0,  2,  2,
   0,  0, -2,  4, 10,  4, -2,  0,  0,
   0,  0,  0,  2,  8,  2,  0,  0,  0,
  -2,  0,  4,  2,  6,  2,  4,  0, -2,
   0,  0,  0,  2,  4,  2,  0,  0,  0,
   4,  0,  8,  6, 10,  6,  8,  0,  4,
   0,  2,  4,  6,  6,  6,  4,  2,  0,
   0,  0,  2,  6,  6,  6,  2,  0,  0,
];
// prettier-ignore
const PST_DEFENDER = [
  0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,
  0,0,0,0,6,0,0,0,0,
  0,0,0,0,4,0,0,0,0,
  0,0,0,0,0,0,0,0,0,
];
// prettier-ignore
const PST_KING = [
  0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,
  0,0,0,-9,-9,-9,0,0,0,
  0,0,0,-8,-8,-8,0,0,0,
  0,0,0, 1, 5, 1,0,0,0,
];

const PST: number[][] = [];
PST[KING] = PST_KING;
PST[ADVISOR] = PST_DEFENDER;
PST[ELEPHANT] = PST_DEFENDER;
PST[HORSE] = PST_HORSE;
PST[CHARIOT] = PST_CHARIOT;
PST[CANNON] = PST_CANNON;
PST[SOLDIER] = PST_SOLDIER;

/** Bảng gộp giá trị + vị trí: TABLE[piece + 7][sq] (đã mang dấu theo bên) */
const TABLE: Int16Array[] = [];
for (let p = -7; p <= 7; p++) {
  const arr = new Int16Array(90);
  if (p !== 0) {
    const t = Math.abs(p);
    for (let s = 0; s < 90; s++) {
      const r = (s / 9) | 0;
      const c = s % 9;
      const idx = p > 0 ? s : (9 - r) * 9 + c;
      const v = PIECE_VALUE[t]! + PST[t]![idx]!;
      arr[s] = p > 0 ? v : -v;
    }
  }
  TABLE[p + 7] = arr;
}

/** Đánh giá tĩnh, trả về theo góc nhìn bên đang đi */
export function evaluate(pos: Position): number {
  const b = pos.board;
  let score = 0;
  let redDefenders = 0;
  let blackDefenders = 0;
  let redAttack = 0;
  let blackAttack = 0;
  for (let s = 0; s < 90; s++) {
    const p = b[s]!;
    if (p === 0) continue;
    score += TABLE[p + 7]![s]!;
    const t = p > 0 ? p : -p;
    if (t === ADVISOR || t === ELEPHANT) {
      if (p > 0) redDefenders++;
      else blackDefenders++;
    } else if (t === CHARIOT || t === HORSE || t === CANNON) {
      if (p > 0) redAttack++;
      else blackAttack++;
    }
  }
  // Thiếu Sĩ/Tượng nguy hiểm hơn khi đối phương còn nhiều quân tấn công
  score -= (4 - redDefenders) * blackAttack * 6;
  score += (4 - blackDefenders) * redAttack * 6;
  // Lợi thế đi trước nhỏ
  return (pos.side === 1 ? score : -score) + 10;
}
