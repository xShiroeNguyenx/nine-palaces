import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { iccsToMove, moveFrom, moveTo, type Game } from '@np/rules';
import type { MoveInsight } from '@np/ai';
import { AiClient } from '../ai/aiClient';
import type { BoardArrow, BoardBadge } from '../board/Board';
import { useSettings } from '../lib/settings';

export interface EvalInfo {
  redScore: number;
  redWinPercent: number;
}

export interface TrainingApi {
  enabled: boolean;
  square: number | null;
  insights: MoveInsight[] | null;
  loading: boolean;
  evalInfo: EvalInfo | null;
  badges: Map<number, BoardBadge> | undefined;
  arrows: BoardArrow[];
  inspect: (sq: number | null) => void;
  /** Đã từng xem phân tích trong ván này (tính là có trợ giúp) */
  used: boolean;
}

type Job = { kind: 'piece'; sq: number; key: string; budget: number } | { kind: 'eval'; key: string };

export function winColor(p: number): string {
  if (p >= 62) return 'rgba(31,160,70,0.95)';
  if (p >= 48) return 'rgba(210,160,40,0.95)';
  return 'rgba(210,50,40,0.95)';
}

/**
 * Luyện Trình: trỏ/chọn quân → chấm % từng nước đi của quân đó + chuỗi 4–5 nước dự kiến.
 * Chạy trên một Web Worker riêng, có bộ nhớ đệm và tính trước khi rảnh.
 */
export function useTraining(game: Game | null, version: number, enabled: boolean): TrainingApi {
  const { trainingLevel, evalBar } = useSettings();
  const [square, setSquare] = useState<number | null>(null);
  const [insights, setInsights] = useState<MoveInsight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [evalInfo, setEvalInfo] = useState<EvalInfo | null>(null);
  const [used, setUsed] = useState(false);

  const clientRef = useRef<AiClient | null>(null);
  const cache = useRef(new Map<string, MoveInsight[]>());
  const evalCache = useRef(new Map<string, EvalInfo>());
  const busy = useRef(false);
  const queue = useRef<Job[]>([]);
  const wanted = useRef<{ sq: number | null; key: string }>({ sq: null, key: '' });
  const posKey = game && game.variant === 'xiangqi' ? `${game.startFen}|${game.movesIccs().join(',')}` : '';
  const posKeyRef = useRef(posKey);
  posKeyRef.current = posKey;
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    if (!enabled) return;
    clientRef.current = new AiClient();
    return () => {
      clientRef.current?.terminate();
      clientRef.current = null;
      busy.current = false;
      queue.current = [];
    };
  }, [enabled]);

  const pump = useCallback(() => {
    const client = clientRef.current;
    const g = gameRef.current;
    if (busy.current || !client || !g) return;
    // Bỏ việc của thế cờ cũ
    queue.current = queue.current.filter((j) => j.key.slice(0, j.key.lastIndexOf('#')) === posKeyRef.current);
    const job = queue.current.shift();
    if (!job) return;
    const [fen, movesStr] = posKeyRef.current.split('|') as [string, string];
    const moves = movesStr ? movesStr.split(',') : [];
    busy.current = true;
    if (job.kind === 'piece') {
      if (cache.current.has(job.key)) {
        busy.current = false;
        pump();
        return;
      }
      void client.analyzePiece(fen, moves, job.sq, job.budget).then((res) => {
        busy.current = false;
        if (res) cache.current.set(job.key, res);
        if (wanted.current.key === job.key) {
          setInsights(res);
          setLoading(false);
        }
        pump();
      });
    } else {
      void client.evaluate(fen, moves, 350).then((res) => {
        busy.current = false;
        if (res) {
          evalCache.current.set(job.key, res);
          if (job.key === `${posKeyRef.current}#eval`) setEvalInfo(res);
        }
        pump();
      });
    }
  }, []);

  // Mỗi khi thế cờ đổi: đánh giá thế cờ + tính trước cho các quân của bên đi
  useEffect(() => {
    if (!enabled || !game || game.variant !== 'xiangqi') return;
    setInsights(null);
    setSquare(null);
    wanted.current = { sq: null, key: '' };
    queue.current = [];
    const ek = `${posKey}#eval`;
    const cachedEval = evalCache.current.get(ek);
    if (cachedEval) setEvalInfo(cachedEval);
    else if (evalBar) queue.current.push({ kind: 'eval', key: ek });
    if (!game.result) {
      const side = game.pos.side;
      for (let s = 0; s < 90; s++) {
        const p = game.pos.board[s]!;
        if (p === 0 || Math.sign(p) !== side) continue;
        if (game.legalMovesFrom(s).length === 0) continue;
        queue.current.push({ kind: 'piece', sq: s, key: `${posKey}#${s}`, budget: 400 });
      }
    }
    pump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, version, posKey]);

  const inspect = useCallback(
    (sq: number | null) => {
      if (!enabled) return;
      setSquare(sq);
      if (sq === null) {
        wanted.current = { sq: null, key: '' };
        setInsights(null);
        setLoading(false);
        return;
      }
      setUsed(true);
      const key = `${posKeyRef.current}#${sq}`;
      wanted.current = { sq, key };
      const hit = cache.current.get(key);
      if (hit) {
        setInsights(hit);
        setLoading(false);
        return;
      }
      setInsights(null);
      setLoading(true);
      // Ưu tiên quân đang xem: đưa lên đầu hàng đợi
      queue.current = [{ kind: 'piece', sq, key, budget: 700 }, ...queue.current.filter((j) => j.key !== key)];
      pump();
    },
    [enabled, pump],
  );

  const badges = useMemo(() => {
    if (!enabled || !insights || square === null) return undefined;
    const m = new Map<number, BoardBadge>();
    for (const ins of insights) {
      m.set(moveTo(iccsToMove(ins.iccs)), { text: `${Math.round(ins.winPercent)}%`, color: winColor(ins.winPercent) });
    }
    return m;
  }, [enabled, insights, square]);

  const arrows = useMemo(() => {
    const out: BoardArrow[] = [];
    if (!enabled || !insights || insights.length === 0 || trainingLevel < 2) return out;
    const best = insights[0]!;
    best.pv.slice(0, 5).forEach((iccs, i) => {
      const mv = iccsToMove(iccs);
      out.push({
        from: moveFrom(mv),
        to: moveTo(mv),
        color: i % 2 === 0 ? 'rgba(20,140,60,0.85)' : 'rgba(200,60,40,0.7)',
        label: String(i + 1),
        width: i === 0 ? 9 : 6,
      });
    });
    return out;
  }, [enabled, insights, trainingLevel]);

  return { enabled, square, insights, loading, evalInfo, badges, arrows, inspect, used };
}
