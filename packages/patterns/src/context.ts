import {
  CANNON,
  CHARIOT,
  HORSE,
  KING,
  SOLDIER,
  colOf,
  moveFrom,
  moveTo,
  rowOf,
  type Game,
  type MoveRecord,
  type Position,
  type Side,
} from '@np/rules';

/**
 * Tọa độ "góc nhìn của mình": luôn quy về như thể mình là bên Đỏ (ở dưới).
 * Dùng ký hiệu ICCS: cột a–i, hàng 0 (đáy của mình) … 9 (đáy đối phương).
 */
export function rel(sq: number, side: Side): number {
  return side === 1 ? sq : (9 - rowOf(sq)) * 9 + (8 - colOf(sq));
}

export function relSq(name: string): number {
  const c = 'abcdefghi'.indexOf(name[0]!);
  const r = 9 - Number(name[1]);
  return r * 9 + c;
}

/** Hàng tương đối: 0 = đáy mình … 9 = đáy đối phương */
export function relRank(sq: number, side: Side): number {
  return 9 - rowOf(rel(sq, side));
}

export function relFile(sq: number, side: Side): number {
  return colOf(rel(sq, side));
}

export interface PatternContext {
  game: Game;
  pos: Position;
  side: Side;
  /** Số nước bên này đã đi */
  ownMoves: number;
  /** Các nước của bên này (theo thứ tự) */
  ownRecords: MoveRecord[];
  last: MoveRecord;
}

export function piecesOf(pos: Position, side: Side, type: number): number[] {
  const res: number[] = [];
  for (let s = 0; s < 90; s++) if (pos.board[s] === side * type) res.push(s);
  return res;
}

/** Có quân của `side` loại `type` ở ô tương đối `name` không */
export function hasAt(ctx: PatternContext, type: number, ...names: string[]): boolean {
  return names.some((n) => {
    const real = rel(relSq(n), ctx.side);
    return ctx.pos.board[real] === ctx.side * type;
  });
}

/** Số quân giữa hai ô trên cùng hàng/cột (-1 nếu không thẳng hàng) */
export function between(pos: Position, a: number, b: number): number {
  const ra = rowOf(a);
  const ca = colOf(a);
  const rb = rowOf(b);
  const cb = colOf(b);
  if (ra !== rb && ca !== cb) return -1;
  const dr = Math.sign(rb - ra);
  const dc = Math.sign(cb - ca);
  let n = 0;
  let r = ra + dr;
  let c = ca + dc;
  while (r !== rb || c !== cb) {
    if (pos.board[r * 9 + c] !== 0) n++;
    r += dr;
    c += dc;
  }
  return n;
}

/** Nước đi của bên này thứ k (0-based) theo tọa độ tương đối */
export function ownMove(ctx: PatternContext, k: number): { piece: string; from: number; to: number } | null {
  const r = ctx.ownRecords[k];
  if (!r) return null;
  return { piece: r.piece, from: rel(moveFrom(r.move), ctx.side), to: rel(moveTo(r.move), ctx.side) };
}

/** Tìm nước đầu tiên của bên này đưa Pháo vào lộ giữa (e2 tương đối) */
export function centralCannonMove(ctx: PatternContext): { from: number; to: number; index: number } | null {
  for (let k = 0; k < ctx.ownRecords.length; k++) {
    const m = ownMove(ctx, k)!;
    if (m.piece === 'cannon' && m.to === relSq('e2')) return { ...m, index: k };
  }
  return null;
}

export const T = { KING, CHARIOT, HORSE, CANNON, SOLDIER };
