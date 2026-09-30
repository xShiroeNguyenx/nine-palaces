import { Link } from 'react-router-dom';
import { LEVELS } from '@np/ai';
import { useProgress } from '../lib/progress';
import { useSession } from '../lib/session';
import { titleOf } from '../lib/cosmetics';
import { InstallButton } from '../lib/pwa';
import { useT } from '../lib/i18n';
import { ONLINE_ENABLED } from '../lib/config';

/** Mục chỉ có khi bật chế độ online */
const ONLINE_ONLY = new Set(['/online', '/watch', '/leaderboard']);

export function HomePage() {
  const t = useT();
  const progress = useProgress((s) => s.progress);
  const user = useSession((s) => s.user);
  const next = LEVELS[progress.aiLevelUnlocked - 1]!;
  const title = titleOf(progress.xp);
  const cards: { to: string; icon: string; title: string; sub: string; primary?: boolean }[] = [
    { to: '/online', icon: '📱', title: t('Chơi với bạn'), sub: t('Tạo phòng, quét QR là vào'), primary: true },
    { to: '/ai', icon: '🤖', title: t('Đánh với máy'), sub: `${progress.aiLevelUnlocked}/10 — ${next.name}`, primary: !ONLINE_ENABLED },
    { to: '/local', icon: '👥', title: t('2 người 1 máy'), sub: t('Cờ tướng hoặc cờ úp trên một thiết bị') },
    { to: '/analysis', icon: '🎓', title: t('Luyện Trình'), sub: t('Xếp thế, xem % và 5 nước tiếp theo') },
    { to: '/watch', icon: '👁', title: t('Xem trận'), sub: t('Các ván công khai đang diễn ra') },
    { to: '/collection', icon: '🎨', title: t('Bộ sưu tập'), sub: t('Bàn cờ, quân cờ, hiệu ứng, thế cờ') },
    { to: '/leaderboard', icon: '🏆', title: t('Bảng xếp hạng'), sub: t('Elo theo thể thức') },
    {
      to: '/profile',
      icon: '👤',
      title: t('Hồ sơ'),
      sub: `${progress.totalWins} ${t('trận thắng')} · ${progress.achievements.length} ${t('thành tựu')}`,
    },
  ].filter((c) => ONLINE_ENABLED || !ONLINE_ONLY.has(c.to));
  return (
    <div className="page home">
      <header className="hero">
        <div className="hero-mark">帥</div>
        <div>
          <h1>Cửu Cung</h1>
          <p className="muted">
            {ONLINE_ENABLED ? t('Cờ tướng với bạn bè, với máy, và xem người khác đánh.') : t('Cờ tướng với máy hoặc với bạn trên cùng một máy.')}
          </p>
          <p className="small">
            {user && (
              <>
                {t('Xin chào,')} <strong>{user.name}</strong> ·{' '}
              </>
            )}
            <span className="accent">{title.name}</span> · {progress.xp} XP
          </p>
        </div>
      </header>

      <div className="menu-grid">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className={`menu-card ${c.primary ? 'primary' : ''}`}>
            <span className="menu-icon">{c.icon}</span>
            <span className="menu-title">{c.title}</span>
            <span className="menu-sub">{c.sub}</span>
          </Link>
        ))}
      </div>
      <InstallButton />
    </div>
  );
}
