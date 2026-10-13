/**
 * Ví xu & mảnh cho gacha "Bảo Khố" (PLAN.md mục 21.5).
 *
 * Đồng bộ kiểu PN-counter: mỗi thiết bị chỉ cộng dồn số xu NÓ đã kiếm / đã tiêu, merge lấy max
 * theo từng thiết bị. Nhờ vậy merge giao hoán, lũy đẳng và không "hồi sinh" xu đã tiêu
 * (luật lấy max cho một số dư duy nhất sẽ trả lại xu đã tiêu ở máy kia).
 * Xu thành tựu và quà một lần tính ra từ TẬP mã, nên merge bao nhiêu lần cũng không cộng trùng.
 */

export interface PityState {
  /** Tổng số lượt đã quay trên thiết bị này (dùng để merge: bản nhiều lượt hơn là bản mới hơn) */
  pulls: number;
  /** Số lượt liên tiếp chưa ra Sử thi trở lên */
  sinceEpic: number;
  /** Số lượt liên tiếp chưa ra Huyền thoại */
  sinceLegend: number;
}

export interface Economy {
  /** Đồ sở hữu nhờ gacha / tiệm mảnh: 'board:jade', 'piece:jade', 'fx:gold', 'frame:dragon'… */
  owned: string[];
  /** Xu kiếm được, cộng dồn theo thiết bị */
  earned: Record<string, number>;
  /** Xu đã tiêu, cộng dồn theo thiết bị */
  spent: Record<string, number>;
  shardsIn: Record<string, number>;
  shardsOut: Record<string, number>;
  pity: Record<string, PityState>;
  /** Ngày đã nhận quà 'YYYY-MM-DD' (giờ địa phương), giữ DAILY_KEEP ngày gần nhất */
  dailyDays: string[];
  /** Quà một lần đã nhận, ví dụ 'welcome' */
  claims: string[];
}

export const EMPTY_ECONOMY: Economy = {
  owned: [],
  earned: {},
  spent: {},
  shardsIn: {},
  shardsOut: {},
  pity: {},
  dailyDays: [],
  claims: [],
};

export const DAILY_KEEP = 40;
export const DAILY_COINS = 20;
/** Thưởng thêm mỗi ngày thứ 7, 14, 21… liên tiếp */
export const DAILY_STREAK_BONUS = 50;
export const CLAIM_COINS: Record<string, number> = { welcome: 300 };
export const ACHIEVEMENT_COINS = 50;
export const RARE_ACHIEVEMENT_COINS = 150;
/** Thành tựu khó: thưởng nhiều xu hơn */
export const RARE_ACHIEVEMENTS = new Set(['bat_bai', 'ai_10', 'mate_ma_hau_phao']);

/* ------------------------------ Chuẩn hoá ------------------------------ */

function cleanCounter(x: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!x || typeof x !== 'object') return out;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    const n = Math.floor(Number(v));
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

function cleanStrings(x: unknown): string[] {
  return Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === 'string'))] : [];
}

/** Điền mặc định, bỏ giá trị hỏng (dữ liệu cũ, sao lưu v1, localStorage bị sửa tay) */
export function normalizeEconomy(x: unknown): Economy {
  const e = (x && typeof x === 'object' ? x : {}) as Partial<Record<keyof Economy, unknown>>;
  const pity: Record<string, PityState> = {};
  if (e.pity && typeof e.pity === 'object') {
    for (const [k, v] of Object.entries(e.pity as Record<string, Partial<PityState>>)) {
      const n = (y: unknown) => Math.max(0, Math.floor(Number(y)) || 0);
      if (v && typeof v === 'object') pity[k] = { pulls: n(v.pulls), sinceEpic: n(v.sinceEpic), sinceLegend: n(v.sinceLegend) };
    }
  }
  return {
    owned: cleanStrings(e.owned),
    earned: cleanCounter(e.earned),
    spent: cleanCounter(e.spent),
    shardsIn: cleanCounter(e.shardsIn),
    shardsOut: cleanCounter(e.shardsOut),
    pity,
    dailyDays: trimDays(cleanStrings(e.dailyDays).filter((d) => DAY_RE.test(d))),
    claims: cleanStrings(e.claims),
  };
}

/* ------------------------------ Merge ------------------------------ */

function maxCounter(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])].sort();

/** Hợp nhất hai bản ví: giao hoán, lũy đẳng, không thu hồi đồ */
export function mergeEconomy(a: Economy, b: Economy): Economy {
  const pity: Record<string, PityState> = { ...a.pity };
  for (const [k, v] of Object.entries(b.pity)) {
    const cur = pity[k];
    // Cùng một thiết bị: bản có nhiều lượt hơn là bản mới hơn. Hoà thì chọn bản nhỏ hơn cho xác định.
    if (!cur || v.pulls > cur.pulls || (v.pulls === cur.pulls && v.sinceLegend * 1000 + v.sinceEpic < cur.sinceLegend * 1000 + cur.sinceEpic)) pity[k] = v;
  }
  return {
    owned: union(a.owned, b.owned),
    earned: maxCounter(a.earned, b.earned),
    spent: maxCounter(a.spent, b.spent),
    shardsIn: maxCounter(a.shardsIn, b.shardsIn),
    shardsOut: maxCounter(a.shardsOut, b.shardsOut),
    pity,
    dailyDays: trimDays(union(a.dailyDays, b.dailyDays)),
    claims: union(a.claims, b.claims),
  };
}

/* ------------------------------ Số dư ------------------------------ */

const sum = (r: Record<string, number>) => Object.values(r).reduce((s, n) => s + n, 0);

export function achievementCoins(achievements: string[]): number {
  return [...new Set(achievements)].reduce((s, id) => s + (RARE_ACHIEVEMENTS.has(id) ? RARE_ACHIEVEMENT_COINS : ACHIEVEMENT_COINS), 0);
}

export function claimCoins(claims: string[]): number {
  return claims.reduce((s, id) => s + (CLAIM_COINS[id] ?? 0), 0);
}

/** Số xu hiện có. Có thể âm khi hai máy offline cùng tiêu một khoản rồi merge: UI hiện 0, khoá quay. */
export function coinBalance(e: Economy, achievements: string[]): number {
  return sum(e.earned) + achievementCoins(achievements) + claimCoins(e.claims) - sum(e.spent);
}

export function shardBalance(e: Economy): number {
  return sum(e.shardsIn) - sum(e.shardsOut);
}

const bump = (r: Record<string, number>, dev: string, n: number) => ({ ...r, [dev]: (r[dev] ?? 0) + n });

export function credit(e: Economy, dev: string, coins: number): Economy {
  const n = Math.floor(coins);
  return n > 0 ? { ...e, earned: bump(e.earned, dev, n) } : e;
}

/** Trừ xu; null nếu không đủ */
export function debit(e: Economy, dev: string, coins: number, achievements: string[]): Economy | null {
  if (coins <= 0) return e;
  if (coinBalance(e, achievements) < coins) return null;
  return { ...e, spent: bump(e.spent, dev, coins) };
}

/** Nhận quà một lần; null nếu đã nhận hoặc mã không tồn tại */
export function claimOnce(e: Economy, id: string): Economy | null {
  if (!(id in CLAIM_COINS) || e.claims.includes(id)) return null;
  return { ...e, claims: [...e.claims, id].sort() };
}

/* ------------------------------ Xu từ ván với máy ------------------------------ */

/** Xu cho một ván với máy: cùng hệ số cấp và cùng mức giảm khi dùng trợ giúp như XP */
export function coinsForAiGame(level: number, outcome: 'win' | 'loss' | 'draw', assisted: boolean): number {
  let c = outcome === 'win' ? 30 : outcome === 'draw' ? 12 : 5;
  if (assisted) c *= 0.5;
  return Math.max(1, Math.round(c * (0.5 + level * 0.15)));
}

/* ------------------------------ Quà hằng ngày ------------------------------ */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Khoá ngày theo giờ địa phương của máy */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y!, m! - 1, d!) / 86_400_000);
}

function trimDays(days: string[]): string[] {
  return [...new Set(days)].sort().slice(-DAILY_KEEP);
}

/** Số ngày nhận quà liên tiếp tính tới `today` (hoặc tới hôm qua nếu hôm nay chưa nhận) */
export function dailyStreak(days: string[], today: string): number {
  const set = new Set(days.map(dayNumber));
  let d = dayNumber(today);
  if (!set.has(d)) d -= 1;
  let n = 0;
  while (set.has(d)) {
    n++;
    d--;
  }
  return n;
}

export function canClaimDaily(e: Economy, today: string): boolean {
  return !e.dailyDays.includes(today);
}

/** Nhận quà hôm nay; null nếu đã nhận */
export function claimDaily(e: Economy, dev: string, today: string): { economy: Economy; coins: number; streak: number } | null {
  if (!canClaimDaily(e, today)) return null;
  const dailyDays = trimDays([...e.dailyDays, today]);
  const streak = dailyStreak(dailyDays, today);
  const coins = DAILY_COINS + (streak % 7 === 0 ? DAILY_STREAK_BONUS : 0);
  return { economy: credit({ ...e, dailyDays }, dev, coins), coins, streak };
}
