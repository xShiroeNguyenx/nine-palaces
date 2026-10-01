import { Suspense, lazy, useEffect, useState, type ComponentType, type MouseEvent } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { Modal, UnlockToasts } from './game/components';
import { useLeaveGuardStore } from './lib/leaveGuard';
import { ONLINE_ENABLED } from './lib/config';
import { Navigate } from 'react-router-dom';

// Tách code theo trang: chỉ tải khi mở trang đó
const named = <K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));
const LocalPage = named(() => import('./pages/LocalPage'), 'LocalPage');
const AiLevelsPage = named(() => import('./pages/AiPages'), 'AiLevelsPage');
const AiGamePage = named(() => import('./pages/AiPages'), 'AiGamePage');
const ProfilePage = named(() => import('./pages/ProfilePages'), 'ProfilePage');
const LeaderboardPage = named(() => import('./pages/ProfilePages'), 'LeaderboardPage');
const MatchPage = named(() => import('./pages/ProfilePages'), 'MatchPage');
const SettingsPage = named(() => import('./pages/MiscPages'), 'SettingsPage');
const AuthCallbackPage = named(() => import('./pages/MiscPages'), 'AuthCallbackPage');
const NotFoundPage = named(() => import('./pages/MiscPages'), 'NotFoundPage');
const CollectionPage = named(() => import('./pages/CollectionPage'), 'CollectionPage');
const AnalysisPage = named(() => import('./pages/AnalysisPage'), 'AnalysisPage');
const ReviewPage = named(() => import('./pages/ReviewPage'), 'ReviewPage');
const OnlinePage = named(() => import('./online/OnlinePage'), 'OnlinePage');
const RoomPage = named(() => import('./online/RoomPage'), 'RoomPage');
const WatchPage = named(() => import('./online/WatchPage'), 'WatchPage');
// Phòng thử hiệu ứng: chỉ có khi chạy dev, bản build production loại bỏ hoàn toàn
const DevFxLab = import.meta.env.DEV ? named(() => import('./pages/DevFxLab'), 'DevFxLab') : null;
import { refreshMe, useSession } from './lib/session';
import { useProgress } from './lib/progress';
import { useSettings } from './lib/settings';
import { useT } from './lib/i18n';
import { OfflineBanner } from './lib/pwa';

const GAME_ROUTES = /^\/(r|j|match)\/|^\/ai\/play|^\/local|^\/analysis|^\/review|^\/dev\//;

/** Màn cha khi bấm quay lại từ một màn chơi (null = quay lại trang trước trong lịch sử) */
function backTarget(pathname: string): string | null {
  if (pathname.startsWith('/ai/play')) return '/ai';
  if (/^\/(r|j)\//.test(pathname)) return '/online';
  if (pathname.startsWith('/match/')) return '/profile';
  if (pathname.startsWith('/review')) return null;
  return '/';
}

function NavBar({ showTabs }: { showTabs: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const guard = useLeaveGuardStore((s) => s.message);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const inGame = !showTabs;

  /** Rời màn chơi: hỏi xác nhận nếu ván đang dở */
  const leave = (go: () => void) => (guard ? setPending(() => go) : go());
  const goBack = () =>
    leave(() => {
      const target = backTarget(pathname);
      const canGoBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
      if (target === null) {
        if (canGoBack) navigate(-1);
        else navigate('/');
      } else navigate(target);
    });
  const onBrand = (e: MouseEvent) => {
    if (!guard) return;
    e.preventDefault();
    leave(() => navigate('/'));
  };

  return (
    <>
      <nav className="nav">
        {inGame && (
          <button className="nav-back" onClick={goBack} aria-label={t('Quay lại')} title={t('Quay lại')}>
            ‹
          </button>
        )}
        <NavLink to="/" className="brand" end onClick={onBrand}>
          <span className="brand-mark">帥</span> Cửu Cung
        </NavLink>
        <div className="nav-links">
          {ONLINE_ENABLED && <NavLink to="/online">{t('Online')}</NavLink>}
          <NavLink to="/ai">{t('Máy')}</NavLink>
          <NavLink to="/local">{t('2 người')}</NavLink>
          <NavLink to="/analysis">{t('Luyện Trình')}</NavLink>
          {ONLINE_ENABLED && <NavLink to="/watch">{t('Xem')}</NavLink>}
          <NavLink to="/collection">{t('Bộ sưu tập')}</NavLink>
          {ONLINE_ENABLED && <NavLink to="/leaderboard">{t('Xếp hạng')}</NavLink>}
          <NavLink to="/profile">{t('Hồ sơ')}</NavLink>
        </div>
        {import.meta.env.DEV && (
          <NavLink to="/dev/fx" className="nav-settings dev-link" aria-label="Phòng thử hiệu ứng" title="Phòng thử hiệu ứng (dev)">
            🧪
          </NavLink>
        )}
        <NavLink to="/settings" className="nav-settings" aria-label={t('Cài đặt')}>
          ⚙
        </NavLink>
      </nav>
      <nav className="tabbar" aria-label="Điều hướng chính" hidden={!showTabs}>
        <NavLink to="/" end>
          <span>🏠</span>
          {t('Trang chủ')}
        </NavLink>
        {ONLINE_ENABLED && (
          <NavLink to="/online">
            <span>📱</span>
            {t('Online')}
          </NavLink>
        )}
        <NavLink to="/ai">
          <span>🤖</span>
          {t('Máy')}
        </NavLink>
        <NavLink to="/collection">
          <span>🎨</span>
          {t('Bộ sưu tập')}
        </NavLink>
        <NavLink to="/profile">
          <span>👤</span>
          {t('Hồ sơ')}
        </NavLink>
      </nav>
      <Modal open={!!pending} onClose={() => setPending(null)} title={t('Rời ván đấu?')}>
        <p>{guard}</p>
        <div className="modal-actions">
          <button
            className="btn danger"
            onClick={() => {
              const go = pending;
              setPending(null);
              go?.();
            }}
          >
            {t('Rời ván')}
          </button>
          <button className="btn primary" onClick={() => setPending(null)}>
            {t('Ở lại')}
          </button>
        </div>
      </Modal>
    </>
  );
}

export function App() {
  const token = useSession((s) => s.token);
  const lang = useSettings((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if (!token) return;
    void refreshMe().then((me) => {
      if (me) {
        useProgress.getState().mergeFromServer(me.progress);
        void useProgress.getState().sync();
      }
    });
  }, [token]);

  return (
    // basename theo base của Vite: "/" hoặc "/nine-palaces/" khi chạy trên GitHub Pages
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Shell />
    </BrowserRouter>
  );
}

function Shell() {
  const { pathname } = useLocation();
  const showTabs = !GAME_ROUTES.test(pathname);
  return (
    <>
      <NavBar showTabs={showTabs} />
      <OfflineBanner />
      <main className={`main ${showTabs ? 'with-tabbar' : ''}`}>
        <Suspense
          fallback={
            <div className="page center">
              <div className="spinner" />
            </div>
          }
        >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/local" element={<LocalPage />} />
          <Route path="/ai" element={<AiLevelsPage />} />
          <Route path="/ai/play" element={<AiGamePage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/online" element={ONLINE_ENABLED ? <OnlinePage /> : <Navigate to="/" replace />} />
          <Route path="/r/:code" element={ONLINE_ENABLED ? <RoomPage /> : <Navigate to="/" replace />} />
          <Route path="/j/:code" element={ONLINE_ENABLED ? <RoomPage /> : <Navigate to="/" replace />} />
          <Route path="/watch" element={ONLINE_ENABLED ? <WatchPage /> : <Navigate to="/" replace />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/leaderboard" element={ONLINE_ENABLED ? <LeaderboardPage /> : <Navigate to="/" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/match/:id" element={ONLINE_ENABLED ? <MatchPage /> : <Navigate to="/" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {DevFxLab && <Route path="/dev/fx" element={<DevFxLab />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </main>
      <UnlockToasts />
    </>
  );
}
