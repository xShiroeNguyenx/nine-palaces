import { Game, type GameResult } from './game';
import { INITIAL_FEN } from './types';

export interface PgnHeaders {
  Event?: string;
  Site?: string;
  Date?: string;
  Red?: string;
  Black?: string;
  Result?: string;
  FEN?: string;
  [key: string]: string | undefined;
}

function resultTag(r: GameResult | null): string {
  if (!r) return '*';
  if (r.winner === 'draw') return '1/2-1/2';
  return r.winner === 'red' ? '1-0' : '0-1';
}

/** Xuất PGN kiểu cờ tướng (Format: ICCS để nhập lại được chính xác, kèm chú thích tiếng Việt) */
export function toPgn(game: Game, headers: PgnHeaders = {}): string {
  const h: PgnHeaders = {
    Game: 'Chinese Chess',
    Event: 'Nine Palaces',
    Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    Result: resultTag(game.result),
    Format: 'ICCS',
    ...headers,
  };
  if (game.startFen !== INITIAL_FEN) h.FEN = game.startFen;
  const lines = Object.entries(h)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `[${k} "${v}"]`);
  const moves: string[] = [];
  game.records.forEach((r, i) => {
    if (i % 2 === 0) moves.push(`${i / 2 + 1}.`);
    moves.push(`${r.iccs} {${r.vi}}`);
  });
  moves.push(resultTag(game.result));
  return `${lines.join('\n')}\n\n${moves.join(' ')}\n`;
}

/** Nhập PGN (chỉ hỗ trợ nước dạng ICCS, như file toPgn xuất ra) */
export function fromPgn(pgn: string): Game {
  const fenMatch = pgn.match(/\[FEN\s+"([^"]+)"\]/);
  const body = pgn.replace(/\[[^\]]*\]/g, '').replace(/\{[^}]*\}/g, ' ');
  const tokens = body.split(/\s+/).filter((t) => /^[a-i][0-9]-?[a-i][0-9]$/i.test(t));
  return Game.fromMoves(fenMatch?.[1] ?? INITIAL_FEN, tokens.map((t) => t.replace('-', '').toLowerCase()));
}
