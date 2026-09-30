import { useEffect, useRef, useState } from 'react';
import type { Game } from '@np/rules';
import { PatternTracker, type PatternHit } from '@np/patterns';
import { useProgress } from '../lib/progress';

/**
 * Nhận diện thế cờ sau mỗi nước (chỉ nước mới, không báo lại khi hoàn tác / kết nối lại).
 * Trả về các thế vừa xuất hiện + dấu thời gian để kích hoạt hiệu ứng.
 */
export function usePatterns(game: Game | null, version: number): { hits: PatternHit[]; stamp: number; mateId: string | null } {
  const tracker = useRef(new PatternTracker());
  const lastGame = useRef<Game | null>(null);
  const lastPly = useRef(0);
  const [state, setState] = useState<{ hits: PatternHit[]; stamp: number; mateId: string | null }>({ hits: [], stamp: 0, mateId: null });
  const seePatterns = useProgress((s) => s.seePatterns);

  useEffect(() => {
    if (!game) return;
    if (lastGame.current !== game) {
      // Ván mới / dựng lại: không báo các thế đã có sẵn
      lastGame.current = game;
      tracker.current = new PatternTracker();
      if (game.ply > 0) tracker.current.prime(game);
      lastPly.current = game.ply;
      if (game.ply > 0) return;
    }
    const ply = game.ply;
    if (ply === lastPly.current + 1) {
      const hits = tracker.current.afterMove(game);
      if (hits.length) {
        setState({ hits, stamp: Date.now(), mateId: hits.find((h) => h.kind === 'mate')?.id ?? null });
        seePatterns(hits.map((h) => h.id));
      } else setState((s) => (s.hits.length ? { hits: [], stamp: s.stamp, mateId: s.mateId } : s));
    } else if (ply > lastPly.current + 1) {
      tracker.current.prime(game);
    }
    lastPly.current = ply;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, version]);

  return state;
}
