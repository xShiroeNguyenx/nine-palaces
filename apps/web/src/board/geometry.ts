/** Hình học bàn cờ (đơn vị viewBox của SVG) */
export const CELL = 60;
export const PAD = 46;
export const BOARD_W = PAD * 2 + CELL * 8;
/** Chiều cao MẶT TRÊN của bàn (phần chơi + lề) */
export const BOARD_H = PAD * 2 + CELL * 9;
/** Bề dày bàn nhìn thấy ở cạnh trước (phía dưới) */
export const EDGE_H = 16;
/** Chiều cao toàn bộ viewBox (mặt trên + bề dày) */
export const VIEW_H = BOARD_H + EDGE_H;
/** Bán kính quân cờ */
export const R = 26;

export function squareCenter(sq: number, flipped: boolean): { x: number; y: number } {
  const row = Math.floor(sq / 9);
  const col = sq % 9;
  const dr = flipped ? 9 - row : row;
  const dc = flipped ? 8 - col : col;
  return { x: PAD + dc * CELL, y: PAD + dr * CELL };
}

/** Sinh số giả ngẫu nhiên ổn định (để trang trí không đổi giữa các lần vẽ) */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
