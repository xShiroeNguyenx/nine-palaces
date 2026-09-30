import { useCallback, useEffect, useRef, useState } from 'react';
import { Game, INITIAL_FEN, type GameEvent, type GameResult, type PlayResult, type Variant } from '@np/rules';
import type { TimeControl } from '@np/shared';

export interface LocalClock {
  red: number;
  black: number;
  turnStartedAt: number | null;
}

export interface LocalGameApi {
  game: Game;
  version: number;
  clock: LocalClock | null;
  lastEvents: GameEvent[];
  play: (from: number, to: number) => PlayResult | null;
  undo: (plies: number) => void;
  restart: (fen?: string, moves?: string[]) => void;
  end: (result: GameResult) => void;
  remaining: (side: 'red' | 'black') => number | null;
}

function freshGame(variant: Variant, fen: string, moves: string[]): Game {
  if (variant === 'jieqi') return Game.newJieqi();
  return Game.fromMoves(fen, moves);
}

/** Quản lý một ván cờ chơi trên máy (2 người cùng máy, đánh với máy, phân tích, cờ úp) */
export function useLocalGame(
  timeControl: TimeControl,
  onEnd?: (r: GameResult) => void,
  variant: Variant = 'xiangqi',
  initialFen: string = INITIAL_FEN,
): LocalGameApi {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = freshGame(variant, initialFen, []);
  const [version, setVersion] = useState(0);
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const clockRef = useRef<LocalClock | null>(
    timeControl ? { red: timeControl.initialMs, black: timeControl.initialMs, turnStartedAt: null } : null,
  );
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const bump = () => setVersion((v) => v + 1);

  const remaining = useCallback((side: 'red' | 'black') => {
    const c = clockRef.current;
    if (!c) return null;
    const g = gameRef.current!;
    if (c.turnStartedAt !== null && g.turn === side && !g.result) return Math.max(0, c[side] - (Date.now() - c.turnStartedAt));
    return c[side];
  }, []);

  const finish = useCallback((result: GameResult) => {
    const c = clockRef.current;
    const g = gameRef.current!;
    if (c && c.turnStartedAt !== null) {
      c[g.turn] = Math.max(0, c[g.turn] - (Date.now() - c.turnStartedAt));
      c.turnStartedAt = null;
    }
    onEndRef.current?.(result);
  }, []);

  const play = useCallback(
    (from: number, to: number): PlayResult | null => {
      const g = gameRef.current!;
      const mover = g.turn;
      const c = clockRef.current;
      if (c && c.turnStartedAt !== null) {
        const left = c[mover] - (Date.now() - c.turnStartedAt);
        if (left <= 0) return null;
      }
      const r = g.play(from, to);
      if (!r.ok) return null;
      if (c) {
        const now = Date.now();
        if (c.turnStartedAt !== null) c[mover] = c[mover] - (now - c.turnStartedAt) + (timeControl?.incrementMs ?? 0);
        c.turnStartedAt = g.result ? null : now;
      }
      setLastEvents(r.events);
      bump();
      if (g.result) finish(g.result);
      return r;
    },
    [timeControl, finish],
  );

  const undo = useCallback((plies: number) => {
    const g = gameRef.current!;
    if (g.undo(plies) > 0) {
      const c = clockRef.current;
      if (c) c.turnStartedAt = g.ply > 0 ? Date.now() : null;
      setLastEvents([]);
      bump();
    }
  }, []);

  const restart = useCallback(
    (fen: string = INITIAL_FEN, moves: string[] = []) => {
      gameRef.current = freshGame(variant, fen, moves);
      clockRef.current = timeControl ? { red: timeControl.initialMs, black: timeControl.initialMs, turnStartedAt: null } : null;
      setLastEvents([]);
      bump();
    },
    [timeControl, variant],
  );

  const end = useCallback(
    (result: GameResult) => {
      const g = gameRef.current!;
      if (g.result) return;
      g.setResult(result);
      finish(result);
      bump();
    },
    [finish],
  );

  // Kiểm tra hết giờ
  useEffect(() => {
    if (!timeControl) return;
    const id = setInterval(() => {
      const g = gameRef.current!;
      const c = clockRef.current;
      if (!c || g.result || c.turnStartedAt === null) return;
      const side = g.turn;
      if (c[side] - (Date.now() - c.turnStartedAt) <= 0) {
        c[side] = 0;
        const result: GameResult = { winner: side === 'red' ? 'black' : 'red', reason: 'timeout' };
        g.setResult(result);
        c.turnStartedAt = null;
        onEndRef.current?.(result);
        bump();
      }
    }, 200);
    return () => clearInterval(id);
  }, [timeControl]);

  return { game: gameRef.current!, version, clock: clockRef.current, lastEvents, play, undo, restart, end, remaining };
}

/** Re-render định kỳ để cập nhật đồng hồ */
export function useTicker(active: boolean, ms = 200): void {
  const [, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}
