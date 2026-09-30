import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Game, moveFrom, moveTo, type GameResult } from '@np/rules';
import { LEVELS } from '@np/ai';
import type { LeaderboardRow, MatchDetail, MatchSummary, RatingMode } from '@np/shared';
import { Board } from '../board/Board';
import { MoveList, ReviewControls, viewPosition } from '../game/components';
import { ACHIEVEMENTS, titleOf } from '../lib/cosmetics';
import { ONLINE_ENABLED } from '../lib/config';
import { END_REASON_VI } from '@np/rules';
import { formatTimeControl, SIDE_VI, timeAgo } from '../lib/format';
import { useProgress } from '../lib/progress';
import { ApiError, api, googleLoginUrl, refreshMe, refreshToken, useSession } from '../lib/session';

const MODE_VI: Record<RatingMode, string> = { bullet: 'Chớp (bullet)', blitz: 'Nhanh (blitz)', rapid: 'Thường (rapid)' };

export function ProfilePage() {
  const { token, user, me, logout } = useSession();
  const progress = useProgress((s) => s.progress);
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void refreshMe();
    if (!ONLINE_ENABLED) return;
    api<MatchSummary[]>('/api/me/matches')
      .then(setMatches)
      .catch(() => setMatches([]));
  }, [token]);

  useEffect(() => setName(user?.name ?? ''), [user?.name]);

  const rename = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/me', { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) });
      await refreshToken();
      await refreshMe();
      setMsg('Đã đổi tên');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Không đổi được tên');
    }
  };

  return (
    <div className="page">
      <h1>Hồ sơ</h1>
      <div className="cards">
        <section className="card">
          <div className="profile-head">
            {user?.avatar ? <img className="avatar" src={user.avatar} alt="" referrerPolicy="no-referrer" /> : <div className="avatar placeholder">👤</div>}
            <div>
              <div className="profile-name">{user?.name ?? 'Khách (chưa kết nối máy chủ)'}</div>
              <div className="muted small">{user ? (user.isGuest ? 'Tài khoản khách' : me?.user.email ?? 'Tài khoản Google') : 'Chơi offline'}</div>
            </div>
          </div>
          {(!user || user.isGuest) && (
            <>
              <p className="small">Đăng nhập Google để chơi xếp hạng và giữ tiến trình trên mọi thiết bị. Tiến trình khách hiện tại sẽ được gộp vào.</p>
              <a className="btn primary big" href={googleLoginUrl('/profile')}>
                Đăng nhập bằng Google
              </a>
            </>
          )}
          {user && (
            <form className="join-form" onSubmit={rename}>
              <input className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-label="Tên hiển thị" />
              <button className="btn" type="submit" disabled={!name.trim() || name.trim() === user.name}>
                Đổi tên
              </button>
            </form>
          )}
          {msg && <div className="muted small">{msg}</div>}
          {user && !user.isGuest && (
            <button className="btn" onClick={logout}>
              Đăng xuất
            </button>
          )}
        </section>

        <section className="card">
          <h2>Tiến trình</h2>
          <div className="stats">
            <Stat label="Danh hiệu" value={titleOf(progress.xp).name} sub={titleOf(progress.xp).next ? `tiếp: ${titleOf(progress.xp).next!.name} (${titleOf(progress.xp).next!.xp} XP)` : 'cao nhất'} />
            <Stat label="XP" value={progress.xp} />
            <Stat label="Thành tựu" value={`${progress.achievements.length}/${ACHIEVEMENTS.length}`} />
            <Stat label="Trận thắng" value={progress.totalWins} />
            <Stat label="Thắng tính mở khóa" value={progress.unlockWins} />
            <Stat label="Chuỗi thắng tốt nhất" value={progress.bestStreak} />
          </div>
          <p className="small">
            Cấp máy đã mở: <strong>{progress.aiLevelUnlocked}</strong> — {LEVELS[progress.aiLevelUnlocked - 1]!.name}
          </p>
        </section>

        {ONLINE_ENABLED && (
        <section className="card">
          <h2>Elo</h2>
          {me && me.ratings.length > 0 ? (
            <div className="stats">
              {me.ratings.map((r) => (
                <Stat key={r.mode} label={MODE_VI[r.mode]} value={r.elo} sub={`${r.wins}T ${r.draws}H ${r.losses}B`} />
              ))}
            </div>
          ) : (
            <p className="muted small">Chưa có ván xếp hạng.</p>
          )}
        </section>
        )}
      </div>

      {ONLINE_ENABLED && (
      <>
      <h2>Lịch sử ván online</h2>
      {!token && <p className="muted">Chưa có ván online.</p>}
      {token && !matches && <div className="spinner small" />}
      {matches && matches.length === 0 && <p className="muted">Chưa có ván online.</p>}
      <div className="room-list">
        {matches?.map((m) => {
          const mySide = m.redId === user?.id ? 'red' : 'black';
          const outcome = m.result === 'draw' ? 'Hòa' : m.result === mySide ? 'Thắng' : 'Thua';
          return (
            <Link key={m.id} to={`/match/${m.id}`} className="room-row link">
              <div className="room-players">
                <span className={`outcome ${outcome === 'Thắng' ? 'win' : outcome === 'Thua' ? 'loss' : 'draw'}`}>{outcome}</span>
                <span className="side-dot red" /> {m.redName} <span className="vs">vs</span> <span className="side-dot black" /> {m.blackName}
              </div>
              <div className="muted small">
                {END_REASON_VI[m.reason as GameResult['reason']] ?? m.reason} · {m.moves} nước · {formatTimeControl(m.timeControl)} ·{' '}
                {m.rated ? 'Xếp hạng' : 'Giao hữu'} · {timeAgo(m.endedAt)}
              </div>
            </Link>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}

export function LeaderboardPage() {
  const [mode, setMode] = useState<RatingMode>('blitz');
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = useSession((s) => s.user);
  useEffect(() => {
    setRows(null);
    setError(null);
    api<LeaderboardRow[]>(`/api/leaderboard?mode=${mode}`, {}, false)
      .then(setRows)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Lỗi tải bảng xếp hạng'));
  }, [mode]);
  return (
    <div className="page narrow">
      <h1>Bảng xếp hạng</h1>
      <div className="chips">
        {(['bullet', 'blitz', 'rapid'] as const).map((m) => (
          <button key={m} className={`chip ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>
            {MODE_VI[m]}
          </button>
        ))}
      </div>
      {error && <div className="error-text">{error}</div>}
      {!rows && !error && <div className="spinner" />}
      {rows && rows.length === 0 && <p className="muted">Chưa có ai chơi xếp hạng ở thể thức này.</p>}
      {rows && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Kỳ thủ</th>
              <th>Elo</th>
              <th>Ván</th>
              <th>Thắng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.userId} className={r.userId === user?.id ? 'me' : ''}>
                <td>{i + 1}</td>
                <td>{r.name}</td>
                <td>
                  <strong>{r.elo}</strong>
                </td>
                <td>{r.games}</td>
                <td>{r.wins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Xem lại biên bản một ván online đã lưu */
export function MatchPage() {
  const { id } = useParams();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewPly, setViewPly] = useState<number | null>(0);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    api<MatchDetail>(`/api/matches/${id}`, {}, false)
      .then(setMatch)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được ván'));
  }, [id]);
  const game = useMemo(
    () => (match ? Game.fromMoves(match.startFen, match.movesList, { variant: match.variant ?? 'xiangqi' }) : null),
    [match],
  );
  if (error)
    return (
      <div className="page narrow center">
        <p className="error-text">{error}</p>
      </div>
    );
  if (!match || !game)
    return (
      <div className="page narrow center">
        <div className="spinner" />
      </div>
    );
  const shownPos = viewPosition(game, viewPly);
  const board = shownPos.board;
  const shown = viewPly ?? game.ply;
  const rec = shown > 0 ? game.records[shown - 1] : undefined;
  return (
    <div className="game-layout">
      <div className="board-column">
        <div className="room-header">
          <span>
            <span className="side-dot red" /> {match.redName} vs <span className="side-dot black" /> {match.blackName}
          </span>
          <span className="muted small">
            {match.result === 'draw' ? 'Hòa' : `${SIDE_VI[match.result as 'red' | 'black']} thắng`} ·{' '}
            {END_REASON_VI[match.reason as GameResult['reason']] ?? match.reason}
          </span>
        </div>
        <div className="board-wrap">
          <Board
            board={board}
            hidden={shownPos.hidden}
            version={shown}
            flipped={flipped}
            interactive={false}
            lastMove={rec ? { from: moveFrom(rec.move), to: moveTo(rec.move) } : null}
          />
        </div>
      </div>
      <aside className="side-panel">
        <div className="controls">
          <button className="btn" onClick={() => setFlipped((f) => !f)}>
            ⇅ Xoay bàn
          </button>
          {game.variant === 'xiangqi' && game.ply > 0 && (
            <Link
              className="btn"
              to="/review"
              state={{ startFen: match.startFen, moves: match.movesList, red: match.redName, black: match.blackName }}
            >
              📈 Phân tích ván
            </Link>
          )}
          <BackButton />
        </div>
        <ReviewControls total={game.ply} viewPly={viewPly} setViewPly={setViewPly} />
        <MoveList records={game.records} viewPly={viewPly} onSelect={(p) => setViewPly(p >= game.ply ? null : p)} />
      </aside>
    </div>
  );
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button className="btn" onClick={() => navigate(-1)}>
      ← Quay lại
    </button>
  );
}
