/**
 * Gacha "Bảo Khố" (PLAN.md mục 21.3): độ hiếm, bảo hiểm (pity), quay ×1/×10, tiệm mảnh.
 * Hàm thuần: nguồn ngẫu nhiên truyền vào (app dùng crypto, test dùng seed).
 */
import { coinBalance, debit, shardBalance, type Economy, type PityState } from './economy';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

/** Tỉ lệ cơ bản (chưa tính bảo hiểm) */
export const RARITY_RATE: Record<Rarity, number> = { common: 0.7, rare: 0.24, epic: 0.05, legendary: 0.01 };
/** Quay trúng đồ đã có → đổi ra số mảnh này */
export const DUPLICATE_SHARDS: Record<Rarity, number> = { common: 2, rare: 5, epic: 20, legendary: 60 };
/** Giá đổi một món ở tiệm mảnh */
export const SHARD_PRICE: Record<Rarity, number> = { common: 10, rare: 30, epic: 120, legendary: 400 };

export const PULL_COST = 100;
export const TEN_PULL_COST = 900;
/** Lượt thứ 10 liên tiếp chưa ra Sử thi+ thì chắc chắn ra */
export const EPIC_PITY = 10;
/** Từ lượt này tỉ lệ Huyền thoại tăng dần */
export const LEGEND_SOFT_PITY = 40;
export const LEGEND_SOFT_STEP = 0.05;
/** Lượt này chắc chắn ra Huyền thoại */
export const LEGEND_PITY = 50;

export interface PoolItem {
  /** Mã có tiền tố loại, ví dụ 'board:jade' */
  id: string;
  rarity: Rarity;
}

export const EMPTY_PITY: PityState = { pulls: 0, sinceEpic: 0, sinceLegend: 0 };

/** Tỉ lệ Huyền thoại ở lượt kế tiếp, tính cả bảo hiểm */
export function legendChance(pity: PityState): number {
  const n = pity.sinceLegend + 1;
  if (n >= LEGEND_PITY) return 1;
  return Math.min(1, RARITY_RATE.legendary + Math.max(0, n - LEGEND_SOFT_PITY) * LEGEND_SOFT_STEP);
}

/** Số lượt tối đa còn lại tới khi chắc chắn ra Sử thi+ / Huyền thoại */
export function pityRemaining(pity: PityState): { epic: number; legendary: number } {
  return { epic: Math.max(1, EPIC_PITY - pity.sinceEpic), legendary: Math.max(1, LEGEND_PITY - pity.sinceLegend) };
}

/** Bốc độ hiếm cho một lượt */
export function rollRarity(pity: PityState, rng: () => number): Rarity {
  const pL = legendChance(pity);
  const r = rng();
  if (r < pL) return 'legendary';
  if (pity.sinceEpic + 1 >= EPIC_PITY) return 'epic';
  // Phần còn lại chia theo tỉ lệ gốc của 3 bậc dưới
  const rest = (r - pL) / (1 - pL);
  const base = 1 - RARITY_RATE.legendary;
  if (rest < RARITY_RATE.epic / base) return 'epic';
  if (rest < (RARITY_RATE.epic + RARITY_RATE.rare) / base) return 'rare';
  return 'common';
}

export function nextPity(pity: PityState, rarity: Rarity): PityState {
  const epicPlus = rarity === 'epic' || rarity === 'legendary';
  return {
    pulls: pity.pulls + 1,
    sinceEpic: epicPlus ? 0 : pity.sinceEpic + 1,
    sinceLegend: rarity === 'legendary' ? 0 : pity.sinceLegend + 1,
  };
}

export interface PullResult {
  item: PoolItem;
  duplicate: boolean;
  shards: number;
}

/** Chọn món trong nhóm độ hiếm; Huyền thoại ưu tiên món chưa có. Nhóm rỗng thì lùi xuống bậc thấp hơn. */
function pick(pool: PoolItem[], rarity: Rarity, owns: (id: string) => boolean, rng: () => number): PoolItem {
  for (let i = RARITIES.indexOf(rarity); i >= 0; i--) {
    const group = pool.filter((p) => p.rarity === RARITIES[i]);
    if (!group.length) continue;
    const fresh = group.filter((p) => !owns(p.id));
    const from = RARITIES[i] === 'legendary' && fresh.length ? fresh : group;
    return from[Math.min(from.length - 1, Math.floor(rng() * from.length))]!;
  }
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
}

export interface PullOptions {
  pool: PoolItem[];
  /** Mã thiết bị (khoá trong các bộ đếm) */
  device: string;
  achievements: string[];
  /** Món đã có sẵn ngoài ví (ví dụ mở bằng trận thắng) */
  ownsOutside: (id: string) => boolean;
  rng: () => number;
}

/** Quay `count` lượt (1 hoặc 10). null nếu không đủ xu hoặc kho rỗng. */
export function pull(e: Economy, count: 1 | 10, o: PullOptions): { economy: Economy; results: PullResult[] } | null {
  if (!o.pool.length) return null;
  const paid = debit(e, o.device, count === 10 ? TEN_PULL_COST : PULL_COST, o.achievements);
  if (!paid) return null;
  const owned = new Set(paid.owned);
  const owns = (id: string) => owned.has(id) || o.ownsOutside(id);
  let pity = paid.pity[o.device] ?? EMPTY_PITY;
  let shards = 0;
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(pity, o.rng);
    pity = nextPity(pity, rarity);
    const item = pick(o.pool, rarity, owns, o.rng);
    const duplicate = owns(item.id);
    const got = duplicate ? DUPLICATE_SHARDS[item.rarity] : 0;
    if (!duplicate) owned.add(item.id);
    shards += got;
    results.push({ item, duplicate, shards: got });
  }
  const economy: Economy = {
    ...paid,
    owned: [...owned].sort(),
    pity: { ...paid.pity, [o.device]: pity },
    shardsIn: shards ? { ...paid.shardsIn, [o.device]: (paid.shardsIn[o.device] ?? 0) + shards } : paid.shardsIn,
  };
  return { economy, results };
}

/** Đổi mảnh lấy một món. null nếu đã có hoặc không đủ mảnh. */
export function buyWithShards(e: Economy, device: string, item: PoolItem, ownsOutside: (id: string) => boolean): Economy | null {
  if (e.owned.includes(item.id) || ownsOutside(item.id)) return null;
  const price = SHARD_PRICE[item.rarity];
  if (shardBalance(e) < price) return null;
  return {
    ...e,
    owned: [...e.owned, item.id].sort(),
    shardsOut: { ...e.shardsOut, [device]: (e.shardsOut[device] ?? 0) + price },
  };
}

export function canPull(e: Economy, count: 1 | 10, achievements: string[]): boolean {
  return coinBalance(e, achievements) >= (count === 10 ? TEN_PULL_COST : PULL_COST);
}

/** RNG có seed (mulberry32) cho test và mô phỏng. Trả số trong [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
