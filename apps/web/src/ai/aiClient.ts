import type { EngineMove, GameReview, MoveInsight } from '@np/ai';
import type { AiRequest, AiResponse } from './ai.worker';

type Pending = { resolve: (r: unknown) => void; onProgress?: (p: number) => void };
type ReqBody = AiRequest extends infer R ? (R extends { id: number } ? Omit<R, 'id'> : never) : never;

/** Engine chạy trong Web Worker để giao diện không bị đứng khi máy nghĩ */
export class AiClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor() {
    this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<AiResponse>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      if (e.data.progress !== undefined && e.data.result === undefined) {
        p.onProgress?.(e.data.progress);
        return;
      }
      this.pending.delete(e.data.id);
      if (e.data.error) console.error('AI lỗi:', e.data.error);
      p.resolve(e.data.result ?? null);
    };
  }

  private request<T>(req: ReqBody, onProgress?: (p: number) => void): Promise<T> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, { resolve: resolve as (r: unknown) => void, onProgress });
      this.worker.postMessage({ ...req, id });
    });
  }

  move(fen: string, moves: string[], level: number): Promise<EngineMove | null> {
    return this.request({ kind: 'move', fen, moves, level });
  }

  hint(fen: string, moves: string[], timeMs = 1200): Promise<EngineMove | null> {
    return this.request({ kind: 'hint', fen, moves, timeMs });
  }

  analyzePiece(fen: string, moves: string[], square: number, timeMs = 800): Promise<MoveInsight[] | null> {
    return this.request({ kind: 'analyzePiece', fen, moves, square, timeMs });
  }

  evaluate(fen: string, moves: string[], timeMs = 400): Promise<{ redScore: number; redWinPercent: number; best: string | null } | null> {
    return this.request({ kind: 'evaluate', fen, moves, timeMs });
  }

  review(fen: string, moves: string[], timeMs: number, onProgress?: (p: number) => void): Promise<GameReview | null> {
    return this.request({ kind: 'review', fen, moves, timeMs }, onProgress);
  }

  terminate(): void {
    this.worker.terminate();
    for (const p of this.pending.values()) p.resolve(null);
    this.pending.clear();
  }
}
