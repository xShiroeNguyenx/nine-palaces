import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TIME_PRESETS, type CreateRoomResponse, type LobbyServerMessage, type RoomSettings } from '@np/shared';
import { WS_URL } from '../lib/config';
import { ApiError, api, ensureToken, googleLoginUrl, useSession } from '../lib/session';
import { sfx } from '../lib/sound';
import { QrScannerModal, parseJoinText } from './qr';
import { useT } from '../lib/i18n';

export function OnlinePage() {
  const t = useT();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const isGuest = !user || user.isGuest;

  // Tạo phòng
  const [preset, setPreset] = useState('10+5');
  const [rated, setRated] = useState(false);
  const [priv, setPriv] = useState(true);
  const [side, setSide] = useState<RoomSettings['side']>('random');
  const [training, setTraining] = useState(false);
  const [variant, setVariant] = useState<'xiangqi' | 'jieqi'>('xiangqi');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vào phòng
  const [codeInput, setCodeInput] = useState('');
  const [scanOpen, setScanOpen] = useState(false);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const tc = TIME_PRESETS.find((p) => p.id === preset)!.tc;
      const jieqi = variant === 'jieqi';
      const settings: RoomSettings = {
        timeControl: tc,
        rated: rated && !jieqi,
        private: priv,
        side,
        training: rated || jieqi ? false : training,
        variant,
      };
      const res = await api<CreateRoomResponse>('/api/rooms', { method: 'POST', body: JSON.stringify(settings) });
      navigate(`/r/${res.code}${res.key ? `?k=${encodeURIComponent(res.key)}` : ''}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tạo được phòng');
    } finally {
      setCreating(false);
    }
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseJoinText(codeInput);
    if (!parsed) {
      setError('Mã phòng gồm 6 ký tự (chữ và số), hoặc dán link mời');
      return;
    }
    navigate(`/r/${parsed.code}${parsed.key ? `?k=${encodeURIComponent(parsed.key)}` : ''}`);
  };

  const onScan = useCallback(
    (text: string) => {
      setScanOpen(false);
      const parsed = parseJoinText(text);
      if (!parsed) {
        setError('Mã QR không phải link phòng Cửu Cung');
        return;
      }
      navigate(`/r/${parsed.code}${parsed.key ? `?k=${encodeURIComponent(parsed.key)}` : ''}`);
    },
    [navigate],
  );

  return (
    <div className="page">
      <h1>{t('Chơi online')}</h1>
      {error && <div className="error-text">{error}</div>}
      <div className="cards">
        <section className="card">
          <h2>{t('⚡ Tạo phòng nhanh')}</h2>
          <p className="muted small">{t('Tạo phòng, đưa mã QR cho bạn quét là vào chung trận.')}</p>
          <label className="field-label">{t('Loại cờ')}</label>
          <div className="chips">
            <button className={`chip ${variant === 'xiangqi' ? 'on' : ''}`} onClick={() => setVariant('xiangqi')}>
              {t('Cờ tướng')}
            </button>
            <button className={`chip ${variant === 'jieqi' ? 'on' : ''}`} onClick={() => setVariant('jieqi')}>
              Cờ úp (giao hữu)
            </button>
          </div>
          <label className="field-label">{t('Thời gian')}</label>
          <div className="chips">
            {TIME_PRESETS.map((p) => (
              <button key={p.id} className={`chip ${preset === p.id ? 'on' : ''}`} onClick={() => setPreset(p.id)}>
                {p.id === 'none' ? '∞' : p.id}
              </button>
            ))}
          </div>
          <label className="field-label">{t('Bên của bạn')}</label>
          <div className="chips">
            {(['random', 'red', 'black'] as const).map((s) => (
              <button key={s} className={`chip ${side === s ? 'on' : ''}`} onClick={() => setSide(s)}>
                {s === 'random' ? 'Ngẫu nhiên' : s === 'red' ? 'Đỏ (đi trước)' : 'Đen'}
              </button>
            ))}
          </div>
          <label className="toggle">
            <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
            Phòng riêng (chỉ ai có link/QR mới vào được)
          </label>
          <label className={`toggle ${isGuest || variant === 'jieqi' ? 'disabled' : ''}`}>
            <input
              type="checkbox"
              checked={rated && variant !== 'jieqi'}
              disabled={isGuest || variant === 'jieqi'}
              onChange={(e) => setRated(e.target.checked)}
            />
            Tính xếp hạng (Elo)
          </label>
          {isGuest && (
            <div className="muted small">
              Ván xếp hạng cần đăng nhập. <a href={googleLoginUrl('/online')}>Đăng nhập Google</a>
            </div>
          )}
          <label className={`toggle ${rated || variant === 'jieqi' ? 'disabled' : ''}`}>
            <input
              type="checkbox"
              checked={training && !rated && variant !== 'jieqi'}
              disabled={rated || variant === 'jieqi'}
              onChange={(e) => setTraining(e.target.checked)}
            />
            Cho phép Luyện Trình (người vào phòng là đồng ý)
          </label>
          <button className="btn primary big" onClick={create} disabled={creating}>
            {creating ? 'Đang tạo…' : t('Tạo phòng & lấy mã QR')}
          </button>
        </section>

        <section className="card">
          <h2>{t('🔑 Vào phòng')}</h2>
          <button className="btn primary big" onClick={() => setScanOpen(true)}>
            {t('📷 Quét mã QR')}
          </button>
          <form onSubmit={join} className="join-form">
            <input
              className="input code-input"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Nhập mã 6 ký tự hoặc dán link"
              autoCapitalize="characters"
            />
            <button className="btn" type="submit">
              Vào
            </button>
          </form>
          <p className="muted small">Mẹo: camera điện thoại cũng quét được mã QR mà không cần mở app.</p>
        </section>

        <QuickMatch isGuest={isGuest} />

        <section className="card">
          <h2>👁 Xem người khác đánh</h2>
          <p className="muted small">Danh sách các ván công khai đang diễn ra.</p>
          <Link className="btn big" to="/watch">
            Xem trận
          </Link>
        </section>
      </div>
      <QrScannerModal open={scanOpen} onClose={() => setScanOpen(false)} onResult={onScan} />
    </div>
  );
}

function QuickMatch({ isGuest }: { isGuest: boolean }) {
  const navigate = useNavigate();
  const [preset, setPreset] = useState('5+3');
  const [rated, setRated] = useState(false);
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => () => wsRef.current?.close(), []);
  useEffect(() => {
    if (!searching) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, [searching]);

  const start = async () => {
    setError(null);
    let token: string;
    try {
      token = await ensureToken();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không kết nối được máy chủ');
      return;
    }
    const tc = TIME_PRESETS.find((p) => p.id === preset)!.tc;
    const ws = new WebSocket(`${WS_URL}/api/lobby/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    setSearching(true);
    setElapsed(0);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'queue:join', rated, timeControl: tc }));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as LobbyServerMessage;
      if (msg.type === 'match:found') {
        sfx.notify();
        ws.close();
        navigate(`/r/${msg.code}${msg.key ? `?k=${encodeURIComponent(msg.key)}` : ''}`);
      } else if (msg.type === 'error') {
        setError(msg.message);
        setSearching(false);
        ws.close();
      }
    };
    ws.onerror = () => {
      setError('Không kết nối được máy chủ ghép trận');
      setSearching(false);
    };
  };

  const cancel = () => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'queue:leave' }));
    ws?.close();
    setSearching(false);
  };

  return (
    <section className="card">
      <h2>🎲 Ghép trận nhanh</h2>
      <p className="muted small">Ghép ngẫu nhiên với người đang chờ cùng thể thức.</p>
      {error && <div className="error-text">{error}</div>}
      <div className="chips">
        {TIME_PRESETS.filter((p) => p.id !== 'none').map((p) => (
          <button key={p.id} className={`chip ${preset === p.id ? 'on' : ''}`} onClick={() => setPreset(p.id)} disabled={searching}>
            {p.id}
          </button>
        ))}
      </div>
      <label className={`toggle ${isGuest ? 'disabled' : ''}`}>
        <input type="checkbox" checked={rated} disabled={isGuest || searching} onChange={(e) => setRated(e.target.checked)} />
        Xếp hạng
      </label>
      {searching ? (
        <div className="searching">
          <div className="spinner small" /> Đang tìm đối thủ… {elapsed}s
          <button className="btn" onClick={cancel}>
            Hủy
          </button>
        </div>
      ) : (
        <button className="btn primary big" onClick={start}>
          Tìm đối thủ
        </button>
      )}
    </section>
  );
}
