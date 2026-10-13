import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { coinBalance, shardBalance } from '@np/shared';
import { useProgress } from '../lib/progress';
import { useSettings } from '../lib/settings';
import { useT } from '../lib/i18n';
import type { FrameId } from '../lib/cosmetics';

/** Số xu và mảnh hiện có. Xu có thể âm sau khi gộp hai máy cùng tiêu offline: hiện 0. */
export function useWallet(): { coins: number; shards: number; debt: boolean } {
  const progress = useProgress((s) => s.progress);
  const coins = coinBalance(progress.economy, progress.achievements);
  return { coins: Math.max(0, coins), shards: Math.max(0, shardBalance(progress.economy)), debt: coins < 0 };
}

/** Huy hiệu xu trên thanh điều hướng: bấm để mở Bảo Khố */
export function CoinBadge() {
  const t = useT();
  const show = useSettings((s) => s.gacha);
  const { coins } = useWallet();
  if (!show) return null;
  return (
    <Link to="/collection?tab=gacha" className="coin-badge" aria-label={`${coins} ${t('xu')} · ${t('Bảo Khố')}`} title={t('Bảo Khố')}>
      🪙 {coins}
    </Link>
  );
}

/** Danh hiệu trong khung đã chọn (đồ Bảo Khố) */
export function TitleFrame({ children, frame }: { children: ReactNode; frame?: FrameId }) {
  const chosen = useSettings((s) => s.frame);
  const f = frame ?? chosen;
  if (f === 'none') return <span className="accent">{children}</span>;
  return <span className={`title-frame frame-${f}`}>{children}</span>;
}
