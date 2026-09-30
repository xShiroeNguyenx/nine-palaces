import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProgress } from '../lib/progress';
import { refreshMe, useSession } from '../lib/session';
import { useSettings } from '../lib/settings';
import { BOARD_SKINS, FX_TIERS, PIECE_SETS } from '../lib/cosmetics';
import { sfx } from '../lib/sound';

/** Nhận token từ Google OAuth (qua #fragment) rồi gộp tiến trình */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const err = hash.get('error');
    const token = hash.get('token');
    const ret = hash.get('return') ?? '/';
    if (err || !token) {
      setError(err ?? 'Đăng nhập không thành công');
      return;
    }
    useSession.getState().setSession(token, null);
    void (async () => {
      const me = await refreshMe();
      if (me) {
        const store = useProgress.getState();
        store.mergeFromServer(me.progress);
        await store.sync();
      }
      navigate(ret.startsWith('/') ? ret : '/', { replace: true });
    })();
  }, [navigate]);
  return (
    <div className="page narrow center">
      {error ? (
        <>
          <h1>Đăng nhập thất bại</h1>
          <p className="error-text">{error}</p>
          <Link className="btn" to="/profile">
            Thử lại
          </Link>
        </>
      ) : (
        <>
          <div className="spinner" />
          <p>Đang đăng nhập…</p>
        </>
      )}
    </div>
  );
}

export function SettingsPage() {
  const s = useSettings();
  return (
    <div className="page narrow">
      <h1>Cài đặt</h1>
      <section className="card">
        <label className="field-label">Ngôn ngữ / Language / 语言</label>
        <div className="chips">
          {(
            [
              ['vi', 'Tiếng Việt'],
              ['en', 'English'],
              ['zh', '中文'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={`chip ${s.lang === id ? 'on' : ''}`} onClick={() => s.update({ lang: id })}>
              {label}
            </button>
          ))}
        </div>
        <label className="field-label">Bàn cờ, bộ quân, bậc hiệu ứng</label>
        <p className="small">
          Đang dùng: bàn <strong>{BOARD_SKINS.find((b) => b.id === s.boardSkin)?.name}</strong>, quân{' '}
          <strong>{PIECE_SETS.find((p) => p.id === s.pieceStyle)?.name}</strong>, hiệu ứng{' '}
          <strong>{FX_TIERS.find((f) => f.id === s.fxTier)?.name}</strong>. <Link to="/collection">Đổi trong Bộ sưu tập →</Link>
        </p>
        <label className="field-label">Ký hiệu nước đi</label>
        <div className="chips">
          <button className={`chip ${s.notation === 'vi' ? 'on' : ''}`} onClick={() => s.update({ notation: 'vi' })}>
            Tiếng Việt (P2-5)
          </button>
          <button className={`chip ${s.notation === 'wxf' ? 'on' : ''}`} onClick={() => s.update({ notation: 'wxf' })}>
            WXF (C2=5)
          </button>
        </div>
        <Toggle label="Âm thanh" checked={s.sound} onChange={(v) => { s.update({ sound: v }); if (v) sfx.notify(); }} />
        <Toggle label="Rung khi chiếu / ăn quân" checked={s.vibrate} onChange={(v) => s.update({ vibrate: v })} />
        <Toggle label="Hiệu ứng (chiếu, ăn quân, hoạt ảnh)" checked={s.effects} onChange={(v) => s.update({ effects: v })} />
        <Toggle label="Hiện ô đi hợp lệ khi chọn quân" checked={s.showHints} onChange={(v) => s.update({ showHints: v })} />
        <Toggle label="Hiện số lộ quanh bàn cờ" checked={s.coordinates} onChange={(v) => s.update({ coordinates: v })} />
        <Toggle label="2 người 1 máy: tự xoay bàn theo lượt" checked={s.autoFlipHotseat} onChange={(v) => s.update({ autoFlipHotseat: v })} />
        <Toggle label="Banner tên thế cờ (Pháo đầu, Bá vương xe…)" checked={s.patternBanners} onChange={(v) => s.update({ patternBanners: v })} />
        <Toggle label="Online: cho phép đi trước (premove) khi chưa tới lượt" checked={s.premove} onChange={(v) => s.update({ premove: v })} />
      </section>
      <section className="card">
        <h2>Luyện Trình</h2>
        <label className="field-label">Mức trợ giúp</label>
        <div className="chips">
          {(
            [
              [1, 'Chỉ % lợi thế'],
              [2, '% + chuỗi 5 nước'],
              [3, '% + chuỗi nước + giải thích'],
            ] as const
          ).map(([l, label]) => (
            <button key={l} className={`chip ${s.trainingLevel === l ? 'on' : ''}`} onClick={() => s.update({ trainingLevel: l })}>
              {label}
            </button>
          ))}
        </div>
        <Toggle label="Hiện thanh đánh giá bên cạnh bàn cờ" checked={s.evalBar} onChange={(v) => s.update({ evalBar: v })} />
        <p className="muted small">Dùng Luyện Trình khi đánh máy sẽ tính là có trợ giúp (XP giảm một nửa). Ván xếp hạng không cho dùng.</p>
      </section>
      {import.meta.env.DEV && (
        <section className="card">
          <h2>Chế độ nhà phát triển</h2>
          <Toggle label="Mở khóa tất cả bàn cờ, quân cờ, hiệu ứng để xem thử" checked={s.unlockAll} onChange={(v) => s.update({ unlockAll: v })} />
          <Link className="btn" to="/dev/fx">
            🧪 Mở phòng thử hiệu ứng
          </Link>
        </section>
      )}
      <section className="card">
        <h2>Luật chơi áp dụng</h2>
        <ul className="rules-list">
          <li>Chiếu bí hoặc hết nước đi: thua.</li>
          <li>
            <strong>Chiếu mãi</strong>: một bên chỉ toàn đi nước chiếu khiến thế cờ lặp lại. Lặp lần 2 sẽ có cảnh báo, lặp lần 3 bên chiếu bị xử
            thua.
          </li>
          <li>Lặp thế cờ 3 lần mà không phải chiếu mãi: hòa.</li>
          <li>60 nước liên tiếp không ăn quân: hòa. Không bên nào còn Xe, Mã, Pháo, Tốt: hòa.</li>
          <li>Ván online: mất kết nối quá 60 giây trong lúc đang đánh bị xử thua.</li>
          <li>
            <strong>Cờ úp</strong>: quân úp đi theo luật của vị trí đang đứng, đi xong thì lật lên; Sĩ, Tượng đã lật được đi khắp bàn (ra khỏi cung,
            qua sông). Chỉ chơi giao hữu.
          </li>
        </ul>
      </section>
      <section className="card">
        <h2>Về ứng dụng</h2>
        <p className="small">
          Nine Palaces — Cửu Cung. Âm thanh được tổng hợp trực tiếp bằng Web Audio. Bàn cờ, quân cờ, hiệu ứng vẽ bằng SVG/Canvas. Phông chữ: Noto
          Serif SC, Ma Shan Zheng, Be Vietnam Pro (SIL Open Font License). Mã QR: qrcode (MIT), html5-qrcode (Apache-2.0).
        </p>
      </section>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function NotFoundPage() {
  return (
    <div className="page narrow center">
      <h1>Không tìm thấy trang</h1>
      <Link className="btn primary" to="/">
        Về trang chủ
      </Link>
    </div>
  );
}
