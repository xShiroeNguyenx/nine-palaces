import { END_REASON_VI, type GameResult } from '@np/rules';
import type { TimeControl } from '@np/shared';
import { useSettings } from './settings';
import { translate } from './i18n';

export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = clamped < 10_000 ? clamped / 1000 : Math.ceil(clamped / 1000);
  if (clamped < 10_000) return totalSec.toFixed(1);
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatTimeControl(tc: TimeControl): string {
  if (!tc) return 'Không giới hạn';
  return `${Math.round(tc.initialMs / 60000)}+${Math.round(tc.incrementMs / 1000)}`;
}

export const SIDE_VI = { red: 'Đỏ', black: 'Đen' } as const;

const REASON_I18N: Record<string, [string, string]> = {
  checkmate: ['Checkmate', '将死'],
  stalemate: ['No legal moves', '困毙'],
  perpetual_check: ['Perpetual check', '长将'],
  repetition: ['Repetition', '重复局面'],
  move_limit: ['60 moves without capture', '60回合无吃子'],
  insufficient_material: ['Insufficient material', '子力不足'],
  resign: ['Resignation', '认输'],
  timeout: ['Time out', '超时'],
  draw_agreed: ['Draw agreed', '议和'],
  abandon: ['Abandoned', '弃局'],
};

export function resultText(r: GameResult, perspective?: 'red' | 'black' | null): { title: string; detail: string } {
  const lang = useSettings.getState().lang;
  const detail = lang === 'vi' ? END_REASON_VI[r.reason] : REASON_I18N[r.reason]![lang === 'en' ? 0 : 1];
  if (r.winner === 'draw') return { title: translate(lang, 'Hòa cờ'), detail };
  if (!perspective) return { title: translate(lang, `${SIDE_VI[r.winner]} thắng`), detail };
  return { title: translate(lang, r.winner === perspective ? 'Bạn thắng!' : 'Bạn thua'), detail };
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}
