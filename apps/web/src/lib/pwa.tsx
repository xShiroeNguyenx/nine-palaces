import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

/** Nút "Cài ứng dụng" (chỉ hiện khi trình duyệt cho phép cài PWA) */
export function InstallButton() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  if (standalone) return null;
  if (!deferred) {
    return isIos ? (
      <p className="muted small install-hint">Cài lên màn hình chính: bấm nút Chia sẻ của Safari → "Thêm vào MH chính".</p>
    ) : null;
  }
  return (
    <button
      className="btn install-btn"
      onClick={async () => {
        await deferred?.prompt();
        deferred = null;
        force((x) => x + 1);
      }}
    >
      📲 Cài ứng dụng lên máy (chơi được khi không có mạng)
    </button>
  );
}

/** Theo dõi trạng thái mạng */
export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      📴 Đang ngoại tuyến — vẫn chơi được với máy, 2 người 1 máy và Luyện Trình.
    </div>
  );
}
