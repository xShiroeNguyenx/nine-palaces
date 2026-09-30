import { Game, moveNotation, moveToIccs, type Move } from '@np/rules';
import { MATE, MATE_BOUND, Searcher } from './search';

export type NoiseMode = 'none' | 'random' | 'topk' | 'softmax';

export interface LevelConfig {
  level: number;
  name: string;
  maxDepth: number;
  timeMs: number;
  noise: NoiseMode;
  /** random/topk: xác suất chọn "sai"; softmax: nhiệt độ (cp) */
  noiseValue: number;
  /** Số trận thắng cấp liền trước cần để mở cấp này */
  winsToUnlock: number;
  estimatedElo: number;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, name: 'Nhập môn', maxDepth: 1, timeMs: 150, noise: 'random', noiseValue: 0.3, winsToUnlock: 0, estimatedElo: 600 },
  { level: 2, name: 'Tập sự', maxDepth: 2, timeMs: 200, noise: 'topk', noiseValue: 0.2, winsToUnlock: 1, estimatedElo: 800 },
  { level: 3, name: 'Sơ cấp', maxDepth: 3, timeMs: 300, noise: 'topk', noiseValue: 0.1, winsToUnlock: 1, estimatedElo: 1000 },
  { level: 4, name: 'Trung cấp', maxDepth: 3, timeMs: 400, noise: 'softmax', noiseValue: 60, winsToUnlock: 1, estimatedElo: 1200 },
  { level: 5, name: 'Khá', maxDepth: 4, timeMs: 600, noise: 'softmax', noiseValue: 40, winsToUnlock: 1, estimatedElo: 1400 },
  { level: 6, name: 'Giỏi', maxDepth: 5, timeMs: 900, noise: 'softmax', noiseValue: 20, winsToUnlock: 1, estimatedElo: 1600 },
  { level: 7, name: 'Cao thủ', maxDepth: 64, timeMs: 1000, noise: 'none', noiseValue: 0, winsToUnlock: 2, estimatedElo: 1800 },
  { level: 8, name: 'Kỳ thủ', maxDepth: 64, timeMs: 1500, noise: 'none', noiseValue: 0, winsToUnlock: 2, estimatedElo: 2000 },
  { level: 9, name: 'Đại sư', maxDepth: 64, timeMs: 2200, noise: 'none', noiseValue: 0, winsToUnlock: 2, estimatedElo: 2200 },
  { level: 10, name: 'Tông sư', maxDepth: 64, timeMs: 3200, noise: 'none', noiseValue: 0, winsToUnlock: 2, estimatedElo: 2400 },
];

export function levelConfig(level: number): LevelConfig {
  return LEVELS[Math.min(Math.max(level, 1), LEVELS.length) - 1]!;
}

export interface EngineMove {
  iccs: string;
  vi: string;
  score: number;
  depth: number;
  nodes: number;
  pv: string[];
  pvVi: string[];
}

let shared: Searcher | null = null;
function searcher(): Searcher {
  if (!shared) shared = new Searcher(20);
  return shared;
}

/** Nước hợp lệ ở gốc, loại các nước khiến bên đi bị xử thua vì chiếu mãi */
export function safeRootMoves(game: Game): Move[] {
  const all = game.legalMoves();
  const safe = all.filter((m) => !game.wouldLoseByPerpetual(m));
  return safe.length > 0 ? safe : all;
}

function pvToStrings(game: Game, pv: Move[]): { iccs: string[]; vi: string[] } {
  const pos = game.pos.clone();
  const iccs: string[] = [];
  const vi: string[] = [];
  for (const m of pv) {
    iccs.push(moveToIccs(m));
    vi.push(moveNotation(pos, m, 'vi'));
    pos.makeMove(m);
  }
  return { iccs, vi };
}

function toEngineMove(game: Game, move: Move, score: number, depth: number, nodes: number, pv: Move[]): EngineMove {
  const full = pv.length && pv[0] === move ? pv : [move];
  const s = pvToStrings(game, full);
  return {
    iccs: moveToIccs(move),
    vi: moveNotation(game.pos, move, 'vi'),
    score,
    depth,
    nodes,
    pv: s.iccs,
    pvVi: s.vi,
  };
}

/** Máy chọn nước theo cấp độ */
export function chooseMove(game: Game, level: number, rnd: () => number = Math.random): EngineMove | null {
  if (game.result) return null;
  const cfg = levelConfig(level);
  const roots = safeRootMoves(game);
  if (roots.length === 0) return null;
  if (roots.length === 1) return toEngineMove(game, roots[0]!, 0, 0, 0, []);
  const s = searcher();
  const pos = game.pos.clone();

  if (cfg.noise === 'random' && rnd() < cfg.noiseValue) {
    const m = roots[Math.floor(rnd() * roots.length)]!;
    return toEngineMove(game, m, 0, 0, 0, []);
  }

  if (cfg.noise === 'topk' || cfg.noise === 'softmax' || cfg.noise === 'random') {
    const scored = s.analyzeRoot(pos, cfg.maxDepth, cfg.timeMs, roots);
    let pick = scored[0]!;
    if (cfg.noise === 'topk' && rnd() < cfg.noiseValue) {
      const k = Math.min(3, scored.length);
      pick = scored[Math.floor(rnd() * k)]!;
    } else if (cfg.noise === 'softmax') {
      // Không bỏ lỡ nước chiếu bí / không tự đi vào thế bị bí
      if (pick.score < MATE_BOUND) {
        const t = cfg.noiseValue;
        const top = scored[0]!.score;
        const candidates = scored.filter((x) => x.score > -MATE_BOUND && top - x.score < t * 6);
        const weights = candidates.map((x) => Math.exp((x.score - top) / t));
        const sum = weights.reduce((a, b) => a + b, 0);
        let r = rnd() * sum;
        for (let i = 0; i < candidates.length; i++) {
          r -= weights[i]!;
          if (r <= 0) {
            pick = candidates[i]!;
            break;
          }
        }
      }
    }
    return toEngineMove(game, pick.move, pick.score, cfg.maxDepth, 0, []);
  }

  const res = s.search(pos, { maxDepth: cfg.maxDepth, timeMs: cfg.timeMs, rootMoves: roots });
  const move = res.move || roots[0]!;
  return toEngineMove(game, move, res.score, res.depth, res.nodes, res.pv);
}

/** Phân tích thế cờ: nước tốt nhất + chuỗi nước dự kiến (dùng cho Gợi ý) */
export function analyze(game: Game, timeMs = 1000, maxDepth = 64): EngineMove | null {
  if (game.result) return null;
  const roots = safeRootMoves(game);
  if (roots.length === 0) return null;
  const res = searcher().search(game.pos.clone(), { maxDepth, timeMs, rootMoves: roots });
  const move = res.move || roots[0]!;
  return toEngineMove(game, move, res.score, res.depth, res.nodes, res.pv);
}

/** Đổi điểm (cp, theo bên đi) → % thắng (0..100) */
export function scoreToWinPercent(cp: number): number {
  if (cp > MATE_BOUND) return 100;
  if (cp < -MATE_BOUND) return 0;
  const k = 0.004;
  return 50 + 50 * (2 / (1 + Math.exp(-k * cp)) - 1);
}

/** Mô tả điểm dạng chữ: "+1.2" hoặc "Bí sau 3" */
export function describeScore(cp: number): string {
  if (cp > MATE_BOUND) return `Chiếu bí sau ${Math.ceil((MATE - cp) / 2)} nước`;
  if (cp < -MATE_BOUND) return `Bị bí sau ${Math.ceil((MATE + cp) / 2)} nước`;
  return `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(1)}`;
}
