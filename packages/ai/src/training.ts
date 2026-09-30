import {
  ADVISOR,
  CANNON,
  CHARIOT,
  ELEPHANT,
  Game,
  HORSE,
  KING,
  SOLDIER,
  hasCrossedRiver,
  moveFrom,
  moveNotation,
  moveTo,
  moveToIccs,
  rowOf,
  type Move,
  type Position,
  type Side,
} from '@np/rules';
import { PIECE_VALUE } from './eval';
import { MATE, MATE_BOUND, Searcher } from './search';
import { safeRootMoves, scoreToWinPercent } from './engine';

export type MoveTag =
  | 'capture'
  | 'check'
  | 'mate'
  | 'hanging'
  | 'trade'
  | 'escape'
  | 'defend'
  | 'develop'
  | 'crossRiver'
  | 'quiet';

export interface MoveInsight {
  iccs: string;
  vi: string;
  /** Điểm theo góc nhìn bên đi (cp) */
  score: number;
  /** % thắng của bên đi sau nước này */
  winPercent: number;
  pv: string[];
  pvVi: string[];
  tags: MoveTag[];
  /** Nhãn tiếng Việt ngắn, ví dụ "Ăn Mã", "Mất Xe!" */
  label: string;
  depth: number;
}

const NAME_VI = ['', 'Tướng', 'Sĩ', 'Tượng', 'Mã', 'Xe', 'Pháo', 'Tốt'];

let shared: Searcher | null = null;
function searcher(): Searcher {
  if (!shared) shared = new Searcher(19);
  return shared;
}

/** Phân loại nhanh ý nghĩa một nước đi (dựa trên luật, không cần tìm kiếm) */
export function classifyMove(pos: Position, m: Move): { tags: MoveTag[]; label: string } {
  const from = moveFrom(m);
  const to = moveTo(m);
  const side = pos.side;
  const piece = pos.board[from]!;
  const type = Math.abs(piece);
  const victim = pos.board[to]!;
  const tags: MoveTag[] = [];
  const labels: string[] = [];

  const attackedBefore = pos.isSquareAttacked(from, -side as Side);
  const defendedBefore = pos.attackersOf(from, side).length > 0;

  pos.makeMove(m);
  const givesCheck = pos.inCheck(pos.side);
  const enemyAttackers = pos.attackersOf(to, pos.side);
  const defenders = pos.attackersOf(to, side);
  const mated = givesCheck && !pos.hasLegalMove();
  pos.unmakeMove();

  const myValue = PIECE_VALUE[type]!;
  const cheapestAttacker = enemyAttackers.length
    ? Math.min(...enemyAttackers.map((s) => PIECE_VALUE[Math.abs(pos.board[s]!)]!))
    : Infinity;

  if (mated) {
    tags.push('mate');
    labels.push('Chiếu bí!');
  } else if (givesCheck) {
    tags.push('check');
    labels.push('Chiếu');
  }
  if (victim !== 0) {
    tags.push('capture');
    labels.push(`Ăn ${NAME_VI[Math.abs(victim)]}`);
  }
  if (type !== KING && enemyAttackers.length > 0 && !mated) {
    const victimValue = victim ? PIECE_VALUE[Math.abs(victim)]! : 0;
    if (defenders.length === 0 || cheapestAttacker < myValue) {
      if (victimValue >= myValue - 20 && victim) {
        tags.push('trade');
        labels.push(`Đổi ${NAME_VI[type]}`);
      } else {
        tags.push('hanging');
        labels.push(`Mất ${NAME_VI[type]}!`);
      }
    } else if (victim) {
      // có bảo vệ, đối phương ăn lại thì là đổi quân
      if (victimValue < myValue) {
        tags.push('trade');
        labels.push('Đổi quân');
      }
    }
  }
  if (!tags.includes('hanging') && attackedBefore && (!defendedBefore || type === CHARIOT) && enemyAttackers.length === 0) {
    tags.push('escape');
    labels.push('Thoát hiểm');
  }
  if (type === SOLDIER && !hasCrossedRiver(side, rowOf(from)) && hasCrossedRiver(side, rowOf(to))) {
    tags.push('crossRiver');
    labels.push('Qua sông');
  }
  if (labels.length === 0) {
    const backRank = side === 1 ? rowOf(from) >= 7 : rowOf(from) <= 2;
    if ((type === HORSE || type === CHARIOT || type === CANNON) && backRank) {
      tags.push('develop');
      labels.push('Phát triển');
    } else if (type === ADVISOR || type === ELEPHANT || type === KING) {
      tags.push('defend');
      labels.push('Giữ cung');
    } else {
      tags.push('quiet');
      labels.push('Nước êm');
    }
  }
  return { tags, label: labels.slice(0, 2).join(' · ') };
}

function pvStrings(pos: Position, pv: Move[]): { iccs: string[]; vi: string[] } {
  const p = pos.clone();
  const iccs: string[] = [];
  const vi: string[] = [];
  for (const m of pv) {
    iccs.push(moveToIccs(m));
    vi.push(moveNotation(p, m, 'vi'));
    p.makeMove(m);
  }
  return { iccs, vi };
}

/**
 * Luyện Trình: chấm điểm mọi nước đi hợp lệ của quân ở ô `square`.
 * Trả về danh sách đã sắp xếp theo điểm giảm dần, mỗi nước kèm chuỗi 4–5 nửa nước dự kiến.
 */
export function analyzePiece(game: Game, square: number, timeMs = 800): MoveInsight[] {
  if (game.result) return [];
  const safe = new Set(safeRootMoves(game));
  const moves = game.legalMovesFrom(square).filter((m) => safe.has(m) || safe.size === 0);
  if (moves.length === 0) return [];
  const budget = Math.max(50, Math.floor(timeMs / moves.length));
  const s = searcher();
  const res: MoveInsight[] = [];
  for (const m of moves) {
    const pos = game.pos.clone();
    const r = s.search(pos, { maxDepth: 64, timeMs: budget, rootMoves: [m] });
    const pv = r.pv.length && r.pv[0] === m ? r.pv.slice(0, 5) : [m];
    const strs = pvStrings(game.pos, pv);
    const cls = classifyMove(game.pos.clone(), m);
    if (r.score > MATE_BOUND && !cls.tags.includes('mate')) {
      cls.tags.unshift('mate');
      cls.label = `Dẫn tới chiếu bí · ${cls.label}`;
    }
    res.push({
      iccs: moveToIccs(m),
      vi: moveNotation(game.pos, m, 'vi'),
      score: r.score,
      winPercent: scoreToWinPercent(r.score),
      pv: strs.iccs,
      pvVi: strs.vi,
      tags: cls.tags,
      label: cls.label,
      depth: r.depth,
    });
  }
  res.sort((a, b) => b.score - a.score);
  return res;
}

/** Điểm thế cờ hiện tại theo góc nhìn bên Đỏ (dùng cho thanh đánh giá) */
export function evaluatePosition(game: Game, timeMs = 400): { redScore: number; redWinPercent: number; best: string | null } {
  if (game.result) {
    const w = game.result.winner;
    const redScore = w === 'draw' ? 0 : w === 'red' ? MATE : -MATE;
    return { redScore, redWinPercent: w === 'draw' ? 50 : w === 'red' ? 100 : 0, best: null };
  }
  const r = searcher().search(game.pos.clone(), { maxDepth: 64, timeMs, rootMoves: safeRootMoves(game) });
  const redScore = game.turn === 'red' ? r.score : -r.score;
  return { redScore, redWinPercent: scoreToWinPercent(redScore), best: r.move ? moveToIccs(r.move) : null };
}

/* ------------------------------------------------------------------ */
/* Đánh giá sau ván                                                   */
/* ------------------------------------------------------------------ */

export type MoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface ReviewedMove {
  ply: number;
  side: 'red' | 'black';
  played: string;
  playedVi: string;
  best: string | null;
  bestVi: string | null;
  /** Điểm trước nước đi, góc nhìn bên đi */
  evalBefore: number;
  /** Điểm sau nước đi, góc nhìn bên đi */
  evalAfter: number;
  loss: number;
  cls: MoveClass;
  accuracy: number;
}

export interface GameReview {
  moves: ReviewedMove[];
  accuracy: { red: number; black: number };
  counts: { red: Record<MoveClass, number>; black: Record<MoveClass, number> };
  /** Điểm theo góc nhìn Đỏ sau mỗi nửa nước (index 0 = thế đầu) để vẽ biểu đồ */
  redCurve: number[];
}

const CAP = 2000;
const cap = (x: number) => Math.max(-CAP, Math.min(CAP, x > MATE_BOUND ? CAP : x < -MATE_BOUND ? -CAP : x));

export function classifyLoss(loss: number): MoveClass {
  if (loss <= 15) return 'best';
  if (loss <= 40) return 'good';
  if (loss <= 90) return 'inaccuracy';
  if (loss <= 200) return 'mistake';
  return 'blunder';
}

/** Độ chính xác một nước theo % thắng bị mất (công thức kiểu Lichess) */
export function moveAccuracy(wpBefore: number, wpAfter: number): number {
  const drop = Math.max(0, wpBefore - wpAfter);
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));
}

/**
 * Đánh giá cả ván: tìm kiếm mỗi thế cờ một lần, suy ra điểm nước đã đi và nước tốt nhất.
 * `onProgress` báo tiến độ (0..1).
 */
export function reviewGame(
  startFen: string,
  moves: string[],
  timePerPosition = 250,
  onProgress?: (p: number) => void,
): GameReview {
  const game = Game.fromMoves(startFen, moves);
  const n = game.records.length;
  const s = searcher();
  const evals: number[] = [];
  const bests: (Move | 0)[] = [];
  for (let i = 0; i <= n; i++) {
    const pos = game.positionAt(i);
    if (!pos.hasLegalMove()) {
      evals.push(-MATE);
      bests.push(0);
    } else {
      const r = s.search(pos, { maxDepth: 64, timeMs: timePerPosition });
      evals.push(r.score);
      bests.push(r.move);
    }
    onProgress?.((i + 1) / (n + 1));
  }
  const reviewed: ReviewedMove[] = [];
  const zero = (): Record<MoveClass, number> => ({ best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 });
  const counts = { red: zero(), black: zero() };
  const accSum = { red: 0, black: 0 };
  const accN = { red: 0, black: 0 };
  const redCurve: number[] = [];
  const redStarts = game.positionAt(0).side === 1;
  for (let i = 0; i <= n; i++) {
    const redToMove = (i % 2 === 0) === redStarts;
    redCurve.push(cap(redToMove ? evals[i]! : -evals[i]!));
  }

  for (let i = 0; i < n; i++) {
    const rec = game.records[i]!;
    const before = cap(evals[i]!);
    const after = cap(-evals[i + 1]!);
    const bestMove = bests[i]!;
    const playedIsBest = bestMove !== 0 && bestMove === rec.move;
    const loss = playedIsBest ? 0 : Math.max(0, before - after);
    const cls = classifyLoss(loss);
    const acc = playedIsBest ? 100 : moveAccuracy(scoreToWinPercent(before), scoreToWinPercent(after));
    const posBefore = game.positionAt(i);
    reviewed.push({
      ply: i + 1,
      side: rec.side,
      played: rec.iccs,
      playedVi: rec.vi,
      best: bestMove ? moveToIccs(bestMove) : null,
      bestVi: bestMove ? moveNotation(posBefore, bestMove, 'vi') : null,
      evalBefore: before,
      evalAfter: after,
      loss,
      cls,
      accuracy: acc,
    });
    counts[rec.side][cls]++;
    accSum[rec.side] += acc;
    accN[rec.side]++;
  }
  return {
    moves: reviewed,
    accuracy: {
      red: accN.red ? accSum.red / accN.red : 100,
      black: accN.black ? accSum.black / accN.black : 100,
    },
    counts,
    redCurve,
  };
}

export const MOVE_CLASS_VI: Record<MoveClass, string> = {
  best: 'Tốt nhất',
  good: 'Tốt',
  inaccuracy: 'Chưa chính xác',
  mistake: 'Sai lầm',
  blunder: 'Sai lầm nghiêm trọng',
};
