import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicRoomSummary } from '@np/shared';
import { api, ApiError } from '../lib/session';
import { formatTimeControl, timeAgo } from '../lib/format';

export function WatchPage() {
  const [rooms, setRooms] = useState<PublicRoomSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await api<PublicRoomSummary[]>('/api/rooms/public', {}, false);
        if (alive) {
          setRooms(r);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof ApiError ? e.message : 'Không tải được danh sách');
      }
    };
    void load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const playing = rooms?.filter((r) => r.status === 'playing') ?? [];
  const waiting = rooms?.filter((r) => r.status === 'waiting') ?? [];

  return (
    <div className="page">
      <h1>Xem trận</h1>
      {error && <div className="error-text">{error}</div>}
      {!rooms && !error && <div className="spinner" />}
      {rooms && (
        <>
          <h2>Đang đánh ({playing.length})</h2>
          {playing.length === 0 && <p className="muted">Chưa có ván công khai nào đang diễn ra.</p>}
          <div className="room-list">
            {playing.map((r) => (
              <RoomRow key={r.code} r={r} />
            ))}
          </div>
          <h2>Phòng đang chờ ({waiting.length})</h2>
          {waiting.length === 0 && <p className="muted">Không có phòng công khai đang chờ.</p>}
          <div className="room-list">
            {waiting.map((r) => (
              <RoomRow key={r.code} r={r} joinable />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RoomRow({ r, joinable }: { r: PublicRoomSummary; joinable?: boolean }) {
  return (
    <div className="room-row">
      <div className="room-players">
        <span className="side-dot red" /> {r.red ?? '—'} {r.redElo ? <span className="elo-tag">{r.redElo}</span> : null}
        <span className="vs">vs</span>
        <span className="side-dot black" /> {r.black ?? '—'} {r.blackElo ? <span className="elo-tag">{r.blackElo}</span> : null}
      </div>
      <div className="muted small">
        {r.variant === 'jieqi' && 'Cờ úp · '}
        {formatTimeControl(r.timeControl)} · {r.rated ? 'Xếp hạng' : 'Giao hữu'} · {r.moves} nước · 👁 {r.spectators} · {timeAgo(r.updatedAt)}
      </div>
      <div className="room-actions">
        <Link className="btn small" to={`/r/${r.code}?as=spectator`}>
          👁 Xem
        </Link>
        {joinable && (
          <Link className="btn small primary" to={`/r/${r.code}`}>
            Vào chơi
          </Link>
        )}
      </div>
    </div>
  );
}
