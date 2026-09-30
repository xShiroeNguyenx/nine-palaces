/// <reference lib="webworker" />
import { Game } from '@np/rules';
import { analyze, analyzePiece, chooseMove, evaluatePosition, reviewGame } from '@np/ai';

export type AiRequest =
  | { id: number; kind: 'move'; fen: string; moves: string[]; level: number }
  | { id: number; kind: 'hint'; fen: string; moves: string[]; timeMs?: number }
  | { id: number; kind: 'analyzePiece'; fen: string; moves: string[]; square: number; timeMs?: number }
  | { id: number; kind: 'evaluate'; fen: string; moves: string[]; timeMs?: number }
  | { id: number; kind: 'review'; fen: string; moves: string[]; timeMs?: number };

export interface AiResponse {
  id: number;
  result?: unknown;
  progress?: number;
  error?: string;
}

const post = (msg: AiResponse) => (self as unknown as Worker).postMessage(msg);

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const req = e.data;
  try {
    let result: unknown = null;
    if (req.kind === 'review') {
      result = reviewGame(req.fen, req.moves, req.timeMs ?? 250, (p) => post({ id: req.id, progress: p }));
    } else {
      const game = Game.fromMoves(req.fen, req.moves);
      if (req.kind === 'move') result = chooseMove(game, req.level);
      else if (req.kind === 'hint') result = analyze(game, req.timeMs ?? 1200);
      else if (req.kind === 'analyzePiece') result = analyzePiece(game, req.square, req.timeMs ?? 800);
      else if (req.kind === 'evaluate') result = evaluatePosition(game, req.timeMs ?? 400);
    }
    post({ id: req.id, result });
  } catch (err) {
    post({ id: req.id, result: null, error: String(err) });
  }
};
