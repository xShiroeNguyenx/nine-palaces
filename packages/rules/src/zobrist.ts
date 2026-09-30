/** Bảng Zobrist 2 nửa 32-bit (tránh BigInt để chạy nhanh trong JS). Seed cố định để hash ổn định. */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

const rand = mulberry32(0x9a1ace5);

/** Chỉ số quân: p + 7 (0..14) */
export const ZOBRIST_LO = new Int32Array(15 * 90);
export const ZOBRIST_HI = new Int32Array(15 * 90);
for (let i = 0; i < 15 * 90; i++) {
  ZOBRIST_LO[i] = rand() | 0;
  ZOBRIST_HI[i] = rand() | 0;
}
export const SIDE_LO = rand() | 0;
export const SIDE_HI = rand() | 0;

export const zIndex = (piece: number, square: number): number => (piece + 7) * 90 + square;
