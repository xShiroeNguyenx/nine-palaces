import { create } from 'zustand';
import { LEVELS } from '@np/ai';
import {
  EMPTY_PROGRESS,
  buyWithShards,
  claimDaily,
  claimOnce,
  coinsForAiGame,
  credit,
  dayKey,
  mergeProgress,
  normalizeEconomy,
  pull,
  type ProgressData,
  type PullResult,
} from '@np/shared';
import { deviceId, load, save } from './storage';
import { api, useSession } from './session';
import { GACHA_POOL, ITEM_BY_KEY, newlyUnlocked, rarityOf, unlockedByPlay } from './cosmetics';

export interface AiOutcome {
  unlockedLevel: number | null;
  xpGained: number;
  coinsGained: number;
  countsForUnlock: boolean;
}

/** Một dòng lịch sử quay (chỉ lưu trên máy này, không đồng bộ) */
export interface GachaLogEntry {
  t: number;
  id: string;
  dup: boolean;
}

const GACHA_LOG_MAX = 50;

export interface GameFacts {
  outcome: 'win' | 'loss' | 'draw';
  /** Tên sát cục (id) nếu thắng bằng chiếu bí có tên */
  mateId?: string | null;
  reason?: string;
  variant?: 'xiangqi' | 'jieqi';
  online?: boolean;
  aiLevel?: number;
}

interface ProgressState {
  progress: ProgressData;
  /** Thế cờ đã gặp: id → số lần */
  seenPatterns: Record<string, number>;
  /** Hàng đợi thông báo mở khóa */
  toasts: { id: number; text: string }[];
  gachaLog: GachaLogEntry[];
  recordAiGame: (level: number, outcome: 'win' | 'loss' | 'draw', assisted: boolean, facts?: Partial<GameFacts>) => AiOutcome;
  /** Ghi nhận thành tựu từ một ván (online / 2 người / cờ úp) — số trận thắng online do server cộng */
  recordFacts: (facts: GameFacts) => void;
  grant: (...ids: string[]) => void;
  seePatterns: (ids: string[]) => void;
  mergeFromServer: (p: ProgressData) => void;
  dismissToast: (id: number) => void;
  /** Quà chào mừng Bảo Khố (một lần); false nếu đã nhận */
  claimWelcome: () => boolean;
  /** Quà đăng nhập hôm nay; null nếu đã nhận */
  claimDaily: () => { coins: number; streak: number } | null;
  /** Quay ×1 / ×10; null nếu không đủ xu */
  pull: (count: 1 | 10) => PullResult[] | null;
  /** Đổi mảnh lấy một món (mã 'board:jade'); false nếu không đổi được */
  buyWithShards: (key: string) => boolean;
  sync: () => Promise<void>;
}

/** Số trận thắng cần ở cấp `level` để mở cấp kế tiếp */
export function winsNeededToUnlockNext(level: number): number {
  const next = LEVELS[level];
  return next ? next.winsToUnlock : Infinity;
}

function normalize(p: ProgressData): ProgressData {
  const n = {
    ...EMPTY_PROGRESS,
    ...p,
    aiWins: { ...(p.aiWins ?? {}) },
    achievements: [...(p.achievements ?? [])],
    economy: normalizeEconomy(p.economy),
  };
  // Tính bù: trước đây chỉ thắng máy từ cấp 3 không trợ giúp mới được tính mở khoá.
  // aiWins ghi mọi ván thắng máy, nên số tính mở khoá ít nhất bằng tổng số đó.
  const aiTotal = Object.values(n.aiWins).reduce((a, b) => a + (b ?? 0), 0);
  n.unlockWins = Math.max(n.unlockWins, aiTotal);
  return n;
}

/** Món đã có ngoài ví gacha (mở bằng trận thắng / thành tựu) */
const ownsByPlay = (p: ProgressData) => (key: string) => {
  const it = ITEM_BY_KEY.get(key);
  return !!it && unlockedByPlay(it, p);
};

/** Số ngẫu nhiên [0, 1) từ crypto: kết quả quay không đoán trước được */
function cryptoRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let toastId = 1;

export const useProgress = create<ProgressState>((set, get) => {
  /** Cập nhật tiến trình + sinh thông báo mở khóa */
  const commit = (next: ProgressData) => {
    const before = get().progress;
    const unlocked = newlyUnlocked(before, next);
    save('np.progress', next);
    set((s) => ({
      progress: next,
      toasts: [...s.toasts, ...unlocked.map((text) => ({ id: toastId++, text }))],
    }));
    void get().sync();
  };

  /** Như commit nhưng không đồng bộ lại (tránh vòng lặp) */
  const commitSilentOrToast = (next: ProgressData) => {
    const before = get().progress;
    const unlocked = newlyUnlocked(before, next);
    save('np.progress', next);
    set((s) => ({ progress: next, toasts: [...s.toasts, ...unlocked.map((text) => ({ id: toastId++, text }))] }));
  };

  /** Thao tác Bảo Khố: lưu + đồng bộ, không bắn thông báo mở khoá (màn quay đã tự hiện) */
  const commitQuiet = (next: ProgressData) => {
    save('np.progress', next);
    set({ progress: next });
    void get().sync();
  };

  const achievementsFor = (p: ProgressData, f: Partial<GameFacts>): string[] => {
    const a: string[] = [];
    if (f.outcome === 'win') {
      a.push('first_win');
      if (f.online) a.push('first_online_win');
      if (f.aiLevel && f.aiLevel >= 5) a.push('ai_5');
      if (f.aiLevel === 10) a.push('ai_10');
      if (f.mateId === 'ma_hau_phao') a.push('mate_ma_hau_phao');
      if (f.mateId === 'tot_chieu_bi') a.push('tot_dau_binh');
      if (f.reason === 'perpetual_check') a.push('binh_tinh');
      if (f.variant === 'jieqi') a.push('co_up');
    }
    if (p.streak >= 5) a.push('streak_5');
    if (p.streak >= 10) a.push('bat_bai');
    return a;
  };

  return {
    progress: normalize(load('np.progress', { ...EMPTY_PROGRESS })),
    seenPatterns: load<Record<string, number>>('np.patterns', {}),
    toasts: [],
    gachaLog: load<{ list: GachaLogEntry[] }>('np.gachaLog', { list: [] }).list,

    recordAiGame: (level, outcome, assisted, facts = {}) => {
      const p = normalize(get().progress);
      let unlockedLevel: number | null = null;
      const multiplier = 0.5 + level * 0.15;
      let xp = outcome === 'win' ? 100 : outcome === 'draw' ? 40 : 15;
      if (assisted) xp = Math.round(xp * 0.5);
      xp = Math.round(xp * multiplier);
      p.xp += xp;
      // Mọi ván thắng máy đều tính mở khoá (trợ giúp chỉ làm giảm XP)
      const countsForUnlock = outcome === 'win';
      if (outcome === 'win') {
        p.aiWins[String(level)] = (p.aiWins[String(level)] ?? 0) + 1;
        p.totalWins += 1;
        if (countsForUnlock) p.unlockWins += 1;
        // Đã có tiến trình đáng giữ → xin trình duyệt không tự xoá dữ liệu (Chrome/Safari tự quyết, không hỏi)
        void navigator.storage?.persist?.().catch(() => undefined);
        p.streak += 1;
        p.bestStreak = Math.max(p.bestStreak, p.streak);
        if (level === p.aiLevelUnlocked && level < LEVELS.length) {
          if ((p.aiWins[String(level)] ?? 0) >= winsNeededToUnlockNext(level)) {
            p.aiLevelUnlocked = level + 1;
            unlockedLevel = level + 1;
          }
        }
      } else if (outcome === 'loss') {
        p.streak = 0;
      }
      const ach = achievementsFor(p, { ...facts, outcome, aiLevel: level });
      p.achievements = [...new Set([...p.achievements, ...ach])];
      const coins = coinsForAiGame(level, outcome, assisted);
      p.economy = credit(p.economy, deviceId(), coins);
      commit(p);
      return { unlockedLevel, xpGained: xp, coinsGained: coins, countsForUnlock };
    },

    recordFacts: (facts) => {
      const p = normalize(get().progress);
      const ach = achievementsFor(p, facts);
      const merged = [...new Set([...p.achievements, ...ach])];
      if (merged.length !== p.achievements.length) commit({ ...p, achievements: merged });
    },

    grant: (...ids) => {
      const p = normalize(get().progress);
      const merged = [...new Set([...p.achievements, ...ids])];
      if (merged.length !== p.achievements.length) commit({ ...p, achievements: merged });
    },

    seePatterns: (ids) => {
      if (ids.length === 0) return;
      const seen = { ...get().seenPatterns };
      for (const id of ids) seen[id] = (seen[id] ?? 0) + 1;
      save('np.patterns', seen);
      set({ seenPatterns: seen });
      const extra: string[] = [];
      if (ids.includes('ba_vuong_xe')) extra.push('ba_vuong');
      if (Object.keys(seen).length >= 10) extra.push('nha_suu_tam');
      if (extra.length) get().grant(...extra);
    },

    mergeFromServer: (server) => {
      commitSilentOrToast(normalize(mergeProgress(normalize(get().progress), normalize(server))));
    },

    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    claimWelcome: () => {
      const p = normalize(get().progress);
      const economy = claimOnce(p.economy, 'welcome');
      if (!economy) return false;
      commitQuiet({ ...p, economy });
      return true;
    },

    claimDaily: () => {
      const p = normalize(get().progress);
      const r = claimDaily(p.economy, deviceId(), dayKey(new Date()));
      if (!r) return null;
      commitQuiet({ ...p, economy: r.economy });
      return { coins: r.coins, streak: r.streak };
    },

    pull: (count) => {
      const p = normalize(get().progress);
      const r = pull(p.economy, count, {
        pool: GACHA_POOL,
        device: deviceId(),
        achievements: p.achievements,
        ownsOutside: ownsByPlay(p),
        rng: cryptoRandom,
      });
      if (!r) return null;
      commitQuiet({ ...p, economy: r.economy });
      const now = Date.now();
      const log = [...r.results.map((x) => ({ t: now, id: x.item.id, dup: x.duplicate })).reverse(), ...get().gachaLog].slice(0, GACHA_LOG_MAX);
      save('np.gachaLog', { list: log });
      set({ gachaLog: log });
      return r.results;
    },

    buyWithShards: (key) => {
      const p = normalize(get().progress);
      const it = ITEM_BY_KEY.get(key);
      if (!it) return false;
      const economy = buyWithShards(p.economy, deviceId(), { id: key, rarity: rarityOf(it) }, ownsByPlay(p));
      if (!economy) return false;
      commitQuiet({ ...p, economy });
      return true;
    },

    sync: async () => {
      if (!useSession.getState().token) return;
      if (syncTimer) clearTimeout(syncTimer);
      await new Promise<void>((resolve) => {
        syncTimer = setTimeout(async () => {
          try {
            const merged = await api<ProgressData>('/api/me/progress', {
              method: 'PUT',
              body: JSON.stringify(get().progress),
            });
            const next = normalize(mergeProgress(get().progress, normalize(merged)));
            if (JSON.stringify(next) !== JSON.stringify(get().progress)) commitSilentOrToast(next);
          } catch {
            /* offline: đồng bộ lần sau */
          }
          resolve();
        }, 800);
      });
    },
  };
});
