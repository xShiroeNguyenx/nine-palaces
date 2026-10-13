import { describe, expect, it } from 'vitest';
import {
  EMPTY_ECONOMY,
  EMPTY_PROGRESS,
  claimDaily,
  claimOnce,
  coinBalance,
  coinsForAiGame,
  credit,
  dailyStreak,
  debit,
  mergeEconomy,
  mergeProgress,
  normalizeEconomy,
  type Economy,
} from '../src';
import { ProgressSchema } from '../src/schemas';

const e0 = EMPTY_ECONOMY;

describe('ví xu (PN-counter)', () => {
  it('số dư = xu kiếm + xu thành tựu + quà một lần − xu đã tiêu', () => {
    let e = credit(e0, 'A', 120);
    e = claimOnce(e, 'welcome')!;
    expect(coinBalance(e, ['first_win', 'bat_bai'])).toBe(120 + 300 + 50 + 150);
    e = debit(e, 'A', 100, [])!;
    expect(coinBalance(e, [])).toBe(320);
  });

  it('không cho tiêu quá số dư', () => {
    expect(debit(credit(e0, 'A', 99), 'A', 100, [])).toBeNull();
  });

  it('quà một lần chỉ nhận được một lần, mã lạ bị từ chối', () => {
    const e = claimOnce(e0, 'welcome')!;
    expect(claimOnce(e, 'welcome')).toBeNull();
    expect(claimOnce(e0, 'khong_co')).toBeNull();
  });

  it('xu thành tựu không cộng trùng khi mã lặp', () => {
    expect(coinBalance(e0, ['first_win', 'first_win'])).toBe(50);
  });

  it('merge không hồi sinh xu đã tiêu ở máy khác', () => {
    const base = credit(e0, 'A', 500);
    const spentOnA = debit(base, 'A', 300, [])!;
    // Máy B nhận bản cũ (chưa tiêu), kiếm thêm 40
    const onB = credit(base, 'B', 40);
    const merged = mergeEconomy(spentOnA, onB);
    expect(coinBalance(merged, [])).toBe(500 - 300 + 40);
  });

  it('merge giao hoán và lũy đẳng', () => {
    const a: Economy = { ...debit(credit(e0, 'A', 400), 'A', 100, [])!, owned: ['board:jade'], claims: ['welcome'], dailyDays: ['2026-10-12'] };
    const b: Economy = { ...credit(e0, 'B', 70), owned: ['piece:ice', 'board:jade'], dailyDays: ['2026-10-13'], pity: { B: { pulls: 3, sinceEpic: 3, sinceLegend: 3 } } };
    expect(mergeEconomy(a, b)).toEqual(mergeEconomy(b, a));
    const ab = mergeEconomy(a, b);
    expect(mergeEconomy(ab, ab)).toEqual(ab);
    expect(mergeEconomy(ab, a)).toEqual(ab);
  });

  it('pity cùng thiết bị: giữ bản có nhiều lượt hơn', () => {
    const old: Economy = { ...e0, pity: { A: { pulls: 5, sinceEpic: 5, sinceLegend: 5 } } };
    const now: Economy = { ...e0, pity: { A: { pulls: 6, sinceEpic: 0, sinceLegend: 6 } } };
    expect(mergeEconomy(old, now).pity.A).toEqual({ pulls: 6, sinceEpic: 0, sinceLegend: 6 });
    expect(mergeEconomy(now, old).pity.A).toEqual({ pulls: 6, sinceEpic: 0, sinceLegend: 6 });
  });

  it('hai máy offline cùng tiêu một khoản: số dư âm, không thu hồi đồ', () => {
    const base = credit(e0, 'A', 150);
    const a = { ...debit(base, 'A', 100, [])!, owned: ['board:jade'] };
    const b = { ...debit(base, 'B', 100, [])!, owned: ['piece:ice'] };
    const m = mergeEconomy(a, b);
    expect(coinBalance(m, [])).toBe(-50);
    expect(m.owned).toEqual(['board:jade', 'piece:ice']);
    expect(debit(m, 'A', 1, [])).toBeNull();
  });

  it('mergeProgress gộp cả ví, kể cả dữ liệu cũ chưa có ví', () => {
    const legacy = { ...EMPTY_PROGRESS } as Partial<typeof EMPTY_PROGRESS>;
    delete legacy.economy;
    const withCoins = { ...EMPTY_PROGRESS, economy: credit(e0, 'A', 10) };
    const m = mergeProgress(legacy as typeof EMPTY_PROGRESS, withCoins);
    expect(coinBalance(m.economy, [])).toBe(10);
  });

  it('normalizeEconomy bỏ giá trị hỏng', () => {
    const e = normalizeEconomy({ owned: ['a', 3, 'a'], earned: { A: -5, B: '12', C: 'x' }, dailyDays: ['2026-10-13', 'hôm qua'], pity: { A: { pulls: '2' } } });
    expect(e.owned).toEqual(['a']);
    expect(e.earned).toEqual({ B: 12 });
    expect(e.dailyDays).toEqual(['2026-10-13']);
    expect(e.pity.A).toEqual({ pulls: 2, sinceEpic: 0, sinceLegend: 0 });
    expect(normalizeEconomy(undefined)).toEqual(EMPTY_ECONOMY);
  });
});

describe('xu từ ván với máy', () => {
  it('cùng hệ số cấp như XP, trợ giúp giảm một nửa', () => {
    expect(coinsForAiGame(5, 'win', false)).toBe(38);
    expect(coinsForAiGame(5, 'win', true)).toBe(19);
    expect(coinsForAiGame(1, 'loss', false)).toBe(3);
    expect(coinsForAiGame(10, 'draw', false)).toBe(24);
  });
});

describe('quà hằng ngày', () => {
  it('mỗi ngày nhận một lần', () => {
    const r = claimDaily(e0, 'A', '2026-10-13')!;
    expect(r.coins).toBe(20);
    expect(claimDaily(r.economy, 'A', '2026-10-13')).toBeNull();
  });

  it('ngày thứ 7 liên tiếp được thưởng thêm, qua tháng vẫn liên tiếp', () => {
    let e = e0;
    const days = ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'];
    for (const d of days) e = claimDaily(e, 'A', d)!.economy;
    const r = claimDaily(e, 'A', '2026-10-02')!;
    expect(r.streak).toBe(7);
    expect(r.coins).toBe(70);
  });

  it('chuỗi ngày: hôm nay chưa nhận thì tính tới hôm qua, đứt quãng thì về 0', () => {
    expect(dailyStreak(['2026-10-11', '2026-10-12'], '2026-10-13')).toBe(2);
    expect(dailyStreak(['2026-10-10'], '2026-10-13')).toBe(0);
  });

  it('chỉ giữ 40 ngày gần nhất', () => {
    let e = e0;
    for (let i = 0; i < 60; i++) e = claimDaily(e, 'A', `2026-${String(8 + Math.floor(i / 30)).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`)!.economy;
    expect(e.dailyDays.length).toBe(40);
  });
});

describe('schema server', () => {
  it('nhận tiến trình cũ không có ví và điền mặc định', () => {
    const legacy: Record<string, unknown> = { ...EMPTY_PROGRESS };
    delete legacy.economy;
    const r = ProgressSchema.safeParse(legacy);
    expect(r.success).toBe(true);
    expect(r.success && r.data.economy).toEqual(EMPTY_ECONOMY);
  });

  it('từ chối ví quá nhiều thiết bị', () => {
    const earned = Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`d${i}`, 1]));
    expect(ProgressSchema.safeParse({ ...EMPTY_PROGRESS, economy: { ...EMPTY_ECONOMY, earned } }).success).toBe(false);
  });
});
