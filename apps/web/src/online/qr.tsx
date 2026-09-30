import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../game/components';

export function joinUrl(code: string, key: string | null): string {
  return `${window.location.origin}/j/${code}${key ? `?k=${encodeURIComponent(key)}` : ''}`;
}

export function QrImage({ text, size = 240 }: { text: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(text, { margin: 1, width: size, color: { dark: '#1f1510', light: '#fffaf0' } })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [text, size]);
  return src ? <img className="qr" src={src} width={size} height={size} alt="Mã QR vào phòng" /> : <div className="qr placeholder" />;
}

/** Khối chia sẻ phòng: QR + mã + sao chép + Web Share */
export function SharePanel({ code, roomKey }: { code: string; roomKey: string | null }) {
  const url = joinUrl(code, roomKey);
  const [msg, setMsg] = useState<string | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMsg('Đã sao chép link');
    } catch {
      setMsg('Không sao chép được, hãy copy link bên dưới');
    }
    setTimeout(() => setMsg(null), 1800);
  };
  const share = async () => {
    try {
      await navigator.share({ title: 'Vào phòng cờ tướng', text: `Vào phòng ${code} đánh cờ với mình nhé!`, url });
    } catch {
      /* người dùng hủy */
    }
  };
  return (
    <div className="share-panel">
      <QrImage text={url} />
      <div className="room-code" aria-label="Mã phòng">
        {code.split('').map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>
      <div className="muted small">Quét mã bằng camera điện thoại hoặc gửi link cho bạn</div>
      <div className="share-actions">
        <button className="btn" onClick={copy}>
          📋 Sao chép link
        </button>
        {'share' in navigator && (
          <button className="btn primary" onClick={share}>
            📤 Chia sẻ
          </button>
        )}
      </div>
      {msg && <div className="muted small">{msg}</div>}
      <code className="code-box small-link">{url}</code>
    </div>
  );
}

/** Quét QR trong app (camera sau) */
export function QrScannerModal({ open, onClose, onResult }: { open: boolean; onClose: () => void; onResult: (text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let scanner: { stop: () => Promise<void>; isScanning?: boolean } | null = null;
    let done = false;
    setError(null);
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const s = new Html5Qrcode('qr-reader');
        scanner = s;
        await s.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            if (done) return;
            done = true;
            void s.stop().finally(() => onResult(text));
          },
          () => undefined,
        );
      } catch (e) {
        setError('Không mở được camera. Hãy cho phép quyền camera hoặc nhập mã phòng thủ công.');
        console.error(e);
      }
    })();
    return () => {
      done = true;
      if (scanner?.isScanning !== false) void scanner?.stop().catch(() => undefined);
    };
  }, [open, onResult]);
  return (
    <Modal open={open} onClose={onClose} title="Quét mã QR vào phòng">
      <div id="qr-reader" ref={ref} className="qr-reader" />
      {error && <div className="error-text">{error}</div>}
    </Modal>
  );
}

/** Tách mã phòng + khóa từ nội dung QR (link hoặc mã trần) */
export function parseJoinText(text: string): { code: string; key: string | null } | null {
  const t = text.trim();
  if (/^[A-Z2-9]{6}$/i.test(t)) return { code: t.toUpperCase(), key: null };
  try {
    const u = new URL(t);
    const m = u.pathname.match(/\/(?:j|r)\/([A-Z2-9]{6})/i);
    if (m) return { code: m[1]!.toUpperCase(), key: u.searchParams.get('k') };
  } catch {
    /* không phải URL */
  }
  return null;
}
