import { CANNON, CHARIOT, HORSE, moveFrom, moveTo, type Move, type Position } from '@np/rules';
import { PIECE_VALUE, evaluate } from './eval';

export const MATE = 30000;
export const MATE_BOUND = 29000;
const INF = 32000;
const MAX_PLY = 96;

const FLAG_EXACT = 1;
const FLAG_LOWER = 2;
const FLAG_UPPER = 3;

const defaultNow = (): number => {
  const perf = (globalThis as { performance?: { now(): number } }).performance;
  return perf ? perf.now() : Date.now();
};

export interface SearchOptions {
  maxDepth: number;
  timeMs: number;
  /** Chỉ xét các nước gốc này (ví dụ: đã loại nước dẫn tới thua vì chiếu mãi) */
  rootMoves?: Move[];
  now?: () => number;
}

export interface SearchResult {
  move: Move;
  score: number;
  depth: number;
  nodes: number;
  pv: Move[];
  timeMs: number;
}

export interface RootScore {
  move: Move;
  score: number;
}

export class Searcher {
  private pos!: Position;
  private readonly mask: number;
  private readonly ttLo: Int32Array;
  private readonly ttHi: Int32Array;
  private readonly ttMove: Int32Array;
  private readonly ttScore: Int16Array;
  private readonly ttDepth: Int8Array;
  private readonly ttFlag: Int8Array;
  private readonly killers = new Int32Array(MAX_PLY * 2);
  private readonly history = new Int32Array(90 * 90);
  private nodes = 0;
  private stop = false;
  private canStop = false;
  private deadline = 0;
  private now: () => number = defaultNow;
  private rootFilter: Set<Move> | null = null;
  private rootBest = 0;

  constructor(ttBits = 20) {
    const size = 1 << ttBits;
    this.mask = size - 1;
    this.ttLo = new Int32Array(size);
    this.ttHi = new Int32Array(size);
    this.ttMove = new Int32Array(size);
    this.ttScore = new Int16Array(size);
    this.ttDepth = new Int8Array(size);
    this.ttFlag = new Int8Array(size);
  }

  clear(): void {
    this.ttFlag.fill(0);
    this.history.fill(0);
    this.killers.fill(0);
  }

  search(pos: Position, opts: SearchOptions): SearchResult {
    this.pos = pos;
    this.now = opts.now ?? defaultNow;
    const start = this.now();
    this.deadline = start + opts.timeMs;
    this.nodes = 0;
    this.stop = false;
    this.killers.fill(0);
    for (let i = 0; i < this.history.length; i++) this.history[i] = this.history[i]! >> 2;
    this.rootFilter = opts.rootMoves ? new Set(opts.rootMoves) : null;

    let best: SearchResult = { move: 0, score: 0, depth: 0, nodes: 0, pv: [], timeMs: 0 };
    for (let depth = 1; depth <= opts.maxDepth; depth++) {
      this.canStop = depth > 1;
      this.rootBest = 0;
      const score = this.negamax(depth, -INF, INF, 0, false);
      if (this.stop && depth > 1) break;
      if (this.rootBest) {
        best = {
          move: this.rootBest,
          score,
          depth,
          nodes: this.nodes,
          pv: this.extractPv(this.rootBest, depth),
          timeMs: this.now() - start,
        };
      }
      if (Math.abs(score) > MATE_BOUND) break;
      // Không bắt đầu vòng mới nếu đã dùng quá nửa thời gian
      if (this.now() - start > opts.timeMs * 0.5) break;
    }
    best.nodes = this.nodes;
    best.timeMs = this.now() - start;
    return best;
  }

  /** Chấm điểm từng nước gốc bằng cửa sổ đầy đủ (MultiPV đơn giản) */
  analyzeRoot(pos: Position, depth: number, timeMs: number, rootMoves?: Move[]): RootScore[] {
    this.pos = pos;
    this.now = defaultNow;
    this.deadline = this.now() + timeMs;
    this.nodes = 0;
    this.stop = false;
    this.canStop = false;
    this.rootFilter = null;
    const moves = rootMoves ?? pos.legalMoves();
    const res: RootScore[] = [];
    for (const m of moves) {
      pos.makeMove(m);
      const score = -this.negamax(Math.max(0, depth - 1), -INF, INF, 1, true);
      pos.unmakeMove();
      res.push({ move: m, score });
      // Hết giờ: các nước còn lại chỉ đánh giá nông
      if (this.now() > this.deadline) depth = 1;
      this.canStop = false;
    }
    res.sort((a, b) => b.score - a.score);
    return res;
  }

  private extractPv(first: Move, maxLen: number): Move[] {
    const pv: Move[] = [];
    const pos = this.pos;
    let m = first;
    let made = 0;
    const seen = new Set<string>();
    while (m && pv.length < Math.max(maxLen, 1) + 4) {
      const legal = pos.legalMovesFrom(moveFrom(m));
      if (!legal.includes(m)) break;
      pv.push(m);
      pos.makeMove(m);
      made++;
      const k = `${pos.hashHi}:${pos.hashLo}`;
      if (seen.has(k)) break;
      seen.add(k);
      const idx = pos.hashLo & this.mask;
      m = this.ttFlag[idx] && this.ttLo[idx] === pos.hashLo && this.ttHi[idx] === pos.hashHi ? this.ttMove[idx]! : 0;
    }
    for (let i = 0; i < made; i++) pos.unmakeMove();
    return pv;
  }

  private checkTime(): void {
    if ((++this.nodes & 1023) === 0 && this.canStop && this.now() > this.deadline) this.stop = true;
  }

  private negamax(depth: number, alpha: number, beta: number, ply: number, allowNull: boolean): number {
    this.checkTime();
    if (this.stop) return 0;
    const pos = this.pos;

    if (ply > 0) {
      if (pos.isRepetition()) return 0;
      const mAlpha = Math.max(alpha, -MATE + ply);
      const mBeta = Math.min(beta, MATE - ply - 1);
      if (mAlpha >= mBeta) return mAlpha;
    }

    const inCheck = pos.inCheck(pos.side);
    if (inCheck) depth++;
    if (depth <= 0) return this.quiesce(alpha, beta, ply, 0);
    if (ply >= MAX_PLY - 1) return evaluate(pos);

    const idx = pos.hashLo & this.mask;
    let ttMove = 0;
    if (this.ttFlag[idx] && this.ttLo[idx] === pos.hashLo && this.ttHi[idx] === pos.hashHi) {
      ttMove = this.ttMove[idx]!;
      if (ply > 0 && this.ttDepth[idx]! >= depth) {
        const s = fromTT(this.ttScore[idx]!, ply);
        const f = this.ttFlag[idx];
        if (f === FLAG_EXACT) return s;
        if (f === FLAG_LOWER && s >= beta) return s;
        if (f === FLAG_UPPER && s <= alpha) return s;
      }
    }

    // Null-move pruning (tránh khi bị chiếu hoặc thiếu quân mạnh)
    if (allowNull && !inCheck && depth >= 3 && ply > 0 && hasMajorPieces(pos) && evaluate(pos) >= beta) {
      pos.makeNull();
      const s = -this.negamax(depth - 3, -beta, -beta + 1, ply + 1, false);
      pos.unmakeNull();
      if (this.stop) return 0;
      if (s >= beta) return beta;
    }

    const moves = pos.generatePseudo();
    const scores = this.scoreMoves(moves, ttMove, ply);
    const origAlpha = alpha;
    let best = -INF;
    let bestMove = 0;
    let legal = 0;
    const side = pos.side;

    for (let i = 0; i < moves.length; i++) {
      pickBest(moves, scores, i);
      const m = moves[i]!;
      if (ply === 0 && this.rootFilter && !this.rootFilter.has(m)) continue;
      const captured = pos.board[moveTo(m)]!;
      pos.makeMove(m);
      if (pos.inCheck(side)) {
        pos.unmakeMove();
        continue;
      }
      legal++;
      let score: number;
      if (legal === 1) {
        score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, true);
      } else {
        let r = 0;
        if (depth >= 3 && legal > 4 && !inCheck && captured === 0 && m !== ttMove && !pos.inCheck(pos.side)) {
          r = legal > 12 ? 2 : 1;
        }
        score = -this.negamax(depth - 1 - r, -alpha - 1, -alpha, ply + 1, true);
        if (score > alpha && (r > 0 || score < beta)) {
          score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, true);
        }
      }
      pos.unmakeMove();
      if (this.stop) return 0;

      if (score > best) {
        best = score;
        bestMove = m;
        if (score > alpha) {
          alpha = score;
          if (ply === 0) this.rootBest = m;
          if (alpha >= beta) {
            if (captured === 0) {
              if (this.killers[ply * 2] !== m) {
                this.killers[ply * 2 + 1] = this.killers[ply * 2]!;
                this.killers[ply * 2] = m;
              }
              const hi = moveFrom(m) * 90 + moveTo(m);
              this.history[hi] = this.history[hi]! + depth * depth;
            }
            break;
          }
        }
      }
    }

    if (legal === 0) return -MATE + ply; // hết nước = thua (kể cả không bị chiếu)

    const flag = best <= origAlpha ? FLAG_UPPER : best >= beta ? FLAG_LOWER : FLAG_EXACT;
    this.ttLo[idx] = pos.hashLo;
    this.ttHi[idx] = pos.hashHi;
    this.ttMove[idx] = bestMove;
    this.ttScore[idx] = toTT(best, ply);
    this.ttDepth[idx] = Math.min(depth, 127);
    this.ttFlag[idx] = flag;
    return best;
  }

  private quiesce(alpha: number, beta: number, ply: number, qdepth: number): number {
    this.checkTime();
    if (this.stop) return 0;
    const pos = this.pos;
    if (ply >= MAX_PLY - 1) return evaluate(pos);
    const inCheck = pos.inCheck(pos.side);
    if (!inCheck) {
      const stand = evaluate(pos);
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      if (qdepth >= 10) return stand;
    } else if (qdepth >= 10) {
      return evaluate(pos);
    }
    const moves = inCheck ? pos.generatePseudo() : pos.generatePseudo([], true);
    const scores = this.scoreMoves(moves, 0, ply);
    const side = pos.side;
    let legal = 0;
    for (let i = 0; i < moves.length; i++) {
      pickBest(moves, scores, i);
      const m = moves[i]!;
      pos.makeMove(m);
      if (pos.inCheck(side)) {
        pos.unmakeMove();
        continue;
      }
      legal++;
      const score = -this.quiesce(-beta, -alpha, ply + 1, qdepth + 1);
      pos.unmakeMove();
      if (this.stop) return 0;
      if (score > alpha) {
        alpha = score;
        if (alpha >= beta) return alpha;
      }
    }
    if (inCheck && legal === 0) return -MATE + ply;
    return alpha;
  }

  private scoreMoves(moves: Move[], ttMove: Move, ply: number): Int32Array {
    const b = this.pos.board;
    const scores = new Int32Array(moves.length);
    const k1 = this.killers[ply * 2];
    const k2 = this.killers[ply * 2 + 1];
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i]!;
      if (m === ttMove) {
        scores[i] = 10_000_000;
        continue;
      }
      const victim = b[moveTo(m)]!;
      if (victim !== 0) {
        const attacker = Math.abs(b[moveFrom(m)]!);
        scores[i] = 1_000_000 + PIECE_VALUE[Math.abs(victim)]! * 10 - PIECE_VALUE[attacker]!;
      } else if (m === k1) scores[i] = 900_000;
      else if (m === k2) scores[i] = 800_000;
      else scores[i] = Math.min(this.history[moveFrom(m) * 90 + moveTo(m)]!, 700_000);
    }
    return scores;
  }
}

function pickBest(moves: Move[], scores: Int32Array, i: number): void {
  let bi = i;
  for (let j = i + 1; j < moves.length; j++) if (scores[j]! > scores[bi]!) bi = j;
  if (bi !== i) {
    const tm = moves[i]!;
    moves[i] = moves[bi]!;
    moves[bi] = tm;
    const ts = scores[i]!;
    scores[i] = scores[bi]!;
    scores[bi] = ts;
  }
}

function hasMajorPieces(pos: Position): boolean {
  const b = pos.board;
  const side = pos.side;
  for (let s = 0; s < 90; s++) {
    const p = b[s]! * side;
    if (p === CHARIOT || p === HORSE || p === CANNON) return true;
  }
  return false;
}

function toTT(score: number, ply: number): number {
  if (score > MATE_BOUND) return score + ply;
  if (score < -MATE_BOUND) return score - ply;
  return score;
}

function fromTT(score: number, ply: number): number {
  if (score > MATE_BOUND) return score - ply;
  if (score < -MATE_BOUND) return score + ply;
  return score;
}
