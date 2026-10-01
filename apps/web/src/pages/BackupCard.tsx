import { useEffect, useRef, useState } from 'react';
import { useProgress } from '../lib/progress';
import {
  applyBackup,
  downloadBackup,
  exportBackup,
  isInstalled,
  isIos,
  lastBackupAt,
  parseBackup,
  persistStatus,
  requestPersist,
  type BackupPayload,
} from '../lib/backup';
import { InstallButton } from '../lib/pwa';

const BACKUP_RE = /CC[12]\.[A-Za-z0-9_-]+\.[a-z0-9]{4}/;

/** Khung "Lưu giữ tiến trình" trong Hồ sơ: lưu lâu dài + mã sao lưu / khôi phục */
export function BackupCard() {
  const progress = useProgress((s) => s.progress);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<BackupPayload | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [last, setLast] = useState(lastBackupAt());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void persistStatus().then(setPersisted);
  }, []);

  const makeCode = async () => {
    setCode(await exportBackup());
    setLast(lastBackupAt());
    setCopied(false);
    setMsg(null);
  };
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setMsg({ ok: false, text: 'Không sao chép tự động được. Hãy chọn và sao chép mã thủ công.' });
    }
  };
  const check = async (text: string) => {
    setInput(text);
    setMsg(null);
    setPreview(null);
    if (!text.trim()) return;
    try {
      setPreview(await parseBackup(text));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    const m = BACKUP_RE.exec(text.replace(/\s+/g, ''));
    await check(m ? m[0] : text);
  };
  const restore = () => {
    if (!preview) return;
    applyBackup(preview);
    setMsg({ ok: true, text: 'Đã khôi phục. Tiến trình được gộp với dữ liệu trên máy này, không mất gì.' });
    setPreview(null);
    setInput('');
  };

  const days = last ? Math.floor((Date.now() - last) / 86_400_000) : null;
  const stale = progress.totalWins > 0 && (days === null || days >= 7);
  const ios = isIos();
  const installed = isInstalled();

  return (
    <section className="card backup-card">
      <h2>Lưu giữ tiến trình</h2>
      <p className="small muted">
        Tiến trình (trận thắng, cấp máy, bàn cờ và quân đã mở, thành tựu) lưu trên trình duyệt của máy này. Xoá dữ liệu trình duyệt hoặc đổi máy sẽ mất, trừ khi có mã
        sao lưu.
      </p>

      <div className="backup-status">
        {persisted === true && <span className="ok">✓ Trình duyệt giữ dữ liệu lâu dài</span>}
        {persisted === false && (
          <>
            <span className="warn">Trình duyệt có thể tự xoá dữ liệu khi thiếu bộ nhớ</span>
            <button className="btn small" onClick={() => void requestPersist().then(setPersisted)}>
              Xin giữ lâu dài
            </button>
          </>
        )}
      </div>
      {ios && !installed && (
        <p className="small warn">
          iPhone/iPad: Safari xoá dữ liệu của trang sau 7 ngày không mở. Bấm nút Chia sẻ → "Thêm vào MH chính" để giữ tiến trình.
        </p>
      )}
      {!ios && !installed && <InstallButton />}

      <h3>Sao lưu</h3>
      <p className="small muted">
        {last ? `Lần sao lưu gần nhất: ${days === 0 ? 'hôm nay' : `${days} ngày trước`}.` : 'Chưa sao lưu lần nào.'}
        {stale && <span className="warn"> Nên tạo mã mới.</span>}
      </p>
      <div className="controls">
        <button className="btn primary" onClick={() => void makeCode()}>
          💾 Tạo mã sao lưu
        </button>
        <button className="btn" onClick={() => setRestoreOpen((o) => !o)} aria-expanded={restoreOpen}>
          ♻ Khôi phục
        </button>
      </div>
      {code && (
        <div className="backup-code">
          <textarea className="code-box" readOnly value={code} rows={3} onFocus={(e) => e.currentTarget.select()} aria-label="Mã sao lưu" />
          <div className="controls">
            <button className="btn small" onClick={() => void copy()}>
              {copied ? '✓ Đã sao chép' : 'Sao chép mã'}
            </button>
            <button className="btn small" onClick={() => downloadBackup(code)}>
              Tải file .txt
            </button>
          </div>
          <p className="small muted">
            Gửi mã này cho chính mình (tin nhắn, ghi chú, email) hoặc lưu file. Sang máy khác, vào Hồ sơ → Khôi phục và dán mã.
          </p>
        </div>
      )}

      {restoreOpen && (
        <div className="backup-restore">
          <textarea
            className="input"
            rows={3}
            placeholder="Dán mã sao lưu (bắt đầu bằng CC2.)"
            value={input}
            onChange={(e) => void check(e.target.value)}
            aria-label="Mã sao lưu cần khôi phục"
          />
          <div className="controls">
            <button className="btn small" onClick={() => fileRef.current?.click()}>
              Chọn file .txt
            </button>
            <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          </div>
          {preview && (
            <div className="backup-preview">
              <div className="small">
                Mã tạo lúc {new Date(preview.t).toLocaleString('vi-VN')}: <strong>{preview.progress.totalWins}</strong> trận thắng, cấp máy{' '}
                <strong>{preview.progress.aiLevelUnlocked}</strong>, {preview.progress.achievements?.length ?? 0} thành tựu, {preview.progress.xp} XP.
              </div>
              <button className="btn primary" onClick={restore}>
                Khôi phục (gộp với máy này)
              </button>
            </div>
          )}
        </div>
      )}
      {msg && <p className={`small ${msg.ok ? 'ok' : 'error-text'}`}>{msg.text}</p>}
    </section>
  );
}
