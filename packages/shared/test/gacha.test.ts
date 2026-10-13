import { describe, expect, it } from 'vitest';
import {
  DUPLICATE_SHARDS,
  EMPTY_ECONOMY,
  EMPTY_PITY,
  EPIC_PITY,
  LEGEND_PITY,
  RARITY_RATE,
  SHARD_PRICE,
  buyWithShards,
  coinBalance,
  credit,
  mulberry32,
  nextPity,
  pull,
  rollRarity,
  shardBalance,
  type PityState,
  type PoolItem,
  type Rarity,
} from '../src';

const POOL: PoolItem[] = [
  ...Array.from({ length: 12 }, (_, i) => ({ id: `frame:c${i}`, rarity: 'common' as const })),
  ...Array.from({ length: 8 }, (_, i) => ({ id: `board:r${i}`, rarity: 'rare' as const })),
  ...Array.from({ length: 5 }, (_, i) => ({ id: `piece:e${i}`, rarity: 'epic' as const })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `fx:l${i}`, rarity: 'legendary' as const })),
];

const rich = (coins: number) => credit(EMPTY_ECONOMY, 'A', coins);
const opts = (seed: number, ownsOutside: (id: string) => boolean = () => false) => ({
  pool: POOL,
  device: 'A',
  achievements: [],
  ownsOutside,
  rng: mulberry32(seed),
});

describe('tỉ lệ độ hiếm', () => {
  it('không tính bảo hiểm: 100k lượt lệch tỉ lệ gốc dưới 0.3%', () => {
    const rng = mulberry32(42);
    const n = 100_000;
    const count: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (let i = 0; i < n; i++) count[rollRarity(EMPTY_PITY, rng)]++;
    for (const r of Object.keys(count) as Rarity[]) expect(Math.abs(count[r] / n - RARITY_RATE[r])).toBeLessThan(0.003);
  });

  it('có bảo hiểm: không bao giờ quá 10 lượt chưa ra Sử thi+, quá 50 lượt chưa ra Huyền thoại', () => {
    const rng = mulberry32(7);
    let pity: PityState = EMPTY_PITY;
    let maxEpicGap = 0;
    let maxLegendGap = 0;
    let legend = 0;
    const n = 200_000;
    for (let i = 0; i < n; i++) {
      const r = rollRarity(pity, rng);
      pity = nextPity(pity, r);
      maxEpicGap = Math.max(maxEpicGap, pity.sinceEpic);
      maxLegendGap = Math.max(maxLegendGap, pity.sinceLegend);
      if (r === 'legendary') legend++;
    }
    expect(maxEpicGap).toBeLessThan(EPIC_PITY);
    expect(maxLegendGap).toBeLessThan(LEGEND_PITY);
    // Tỉ lệ thực tế gồm bảo hiểm: tính chính xác 1/36,5 ≈ 2,74% (bảng tỉ lệ hiện "≈ 2,7%")
    expect(legend / n).toBeGreaterThan(0.026);
    expect(legend / n).toBeLessThan(0.029);
  });

  it('lượt thứ 50 chắc chắn Huyền thoại, lượt thứ 10 chắc chắn Sử thi+', () => {
    expect(rollRarity({ pulls: 49, sinceEpic: 0, sinceLegend: 49 }, () => 0.999)).toBe('legendary');
    expect(rollRarity({ pulls: 9, sinceEpic: 9, sinceLegend: 9 }, () => 0.999)).toBe('epic');
  });
});

describe('quay', () => {
  it('×1 trừ 100 xu, ×10 trừ 900 xu và có ít nhất một món Sử thi+', () => {
    const one = pull(rich(100), 1, opts(1))!;
    expect(coinBalance(one.economy, [])).toBe(0);
    for (let seed = 1; seed <= 200; seed++) {
      const ten = pull(rich(900), 10, opts(seed))!;
      expect(coinBalance(ten.economy, [])).toBe(0);
      expect(ten.results).toHaveLength(10);
      expect(ten.results.some((r) => r.item.rarity === 'epic' || r.item.rarity === 'legendary')).toBe(true);
    }
  });

  it('không đủ xu thì không quay', () => {
    expect(pull(rich(99), 1, opts(1))).toBeNull();
    expect(pull(rich(899), 10, opts(1))).toBeNull();
  });

  it('đồ mới vào ví, đồ trùng đổi ra mảnh đúng bậc', () => {
    let e = rich(100_000);
    let shards = 0;
    for (let i = 0; i < 51; i++) {
      const r = pull(e, 10, opts(100 + i))!;
      for (const x of r.results) {
        expect(x.shards).toBe(x.duplicate ? DUPLICATE_SHARDS[x.item.rarity] : 0);
        shards += x.shards;
      }
      e = r.economy;
    }
    // 510 lượt với kho 28 món: chắc chắn có đồ trùng
    expect(new Set(e.owned).size).toBe(e.owned.length);
    expect(shards).toBeGreaterThan(0);
    expect(shardBalance(e)).toBe(shards);
  });

  it('đồ đã mở bằng trận thắng tính là trùng', () => {
    const owns = (id: string) => id.startsWith('frame:');
    const r = pull(rich(100), 1, { ...opts(5, owns), rng: () => 0.5 })!; // 0.5 → Thường
    expect(r.results[0]!.item.rarity).toBe('common');
    expect(r.results[0]!.duplicate).toBe(true);
    expect(r.results[0]!.shards).toBe(DUPLICATE_SHARDS.common);
    expect(r.economy.owned).toEqual([]);
  });

  it('trong cùng một lần ×10, món thứ hai trùng món thứ nhất thì là đồ trùng', () => {
    const tiny: PoolItem[] = [{ id: 'frame:only', rarity: 'common' }];
    const r = pull(rich(900), 10, { ...opts(9), pool: tiny })!;
    expect(r.results.filter((x) => !x.duplicate)).toHaveLength(1);
    expect(r.economy.owned).toEqual(['frame:only']);
  });

  it('Huyền thoại ưu tiên món chưa có', () => {
    const owns = (id: string) => id === 'fx:l0' || id === 'fx:l1';
    const legendRng = () => 0; // luôn rơi vào Huyền thoại
    for (let i = 0; i < 5; i++) {
      const r = pull(rich(100), 1, { ...opts(i, owns), rng: legendRng })!;
      expect(r.results[0]!.item.id).toBe('fx:l2');
    }
  });

  it('bảo hiểm lưu theo thiết bị và nối tiếp giữa các lần quay', () => {
    let e = rich(1000);
    for (let i = 0; i < 3; i++) e = pull(e, 1, { ...opts(i), rng: () => 0.5 })!.economy;
    expect(e.pity.A).toEqual({ pulls: 3, sinceEpic: 3, sinceLegend: 3 });
  });
});

describe('tiệm mảnh', () => {
  const item: PoolItem = { id: 'piece:e0', rarity: 'epic' };
  const withShards = (n: number) => ({ ...EMPTY_ECONOMY, shardsIn: { A: n } });

  it('đủ mảnh thì đổi được và trừ đúng giá', () => {
    const e = buyWithShards(withShards(200), 'A', item, () => false)!;
    expect(e.owned).toContain('piece:e0');
    expect(shardBalance(e)).toBe(200 - SHARD_PRICE.epic);
  });

  it('thiếu mảnh hoặc đã có thì không đổi', () => {
    expect(buyWithShards(withShards(SHARD_PRICE.epic - 1), 'A', item, () => false)).toBeNull();
    expect(buyWithShards(withShards(999), 'A', item, () => true)).toBeNull();
  });
});
