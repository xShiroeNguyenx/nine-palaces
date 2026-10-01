import { EMPTY_PROGRESS, type ProgressData } from '@np/shared';
import { loadRaw, save } from './storage';
import { useProgress } from './progress';
import { useSettings, type Settings } from './settings';

/**
 * Giữ tiến trình của khách khi chưa có tài khoản/máy chủ:
 * 1. Xin trình duyệt lưu dữ liệu lâu dài (không tự xoá khi thiếu bộ nhớ / Safari không xoá sau 7 ngày).
 * 2. Mã sao lưu: đóng gói tiến trình + thế cờ đã gặp + cài đặt thành một chuỗi để chép sang máy khác.
 */

/* ------------------------------ Lưu lâu dài ------------------------------ */

/** true: đã được giữ lâu dài; false: chưa; null: trình duyệt không hỗ trợ */
export async function persistStatus(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persisted) return null;
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}

/** Xin trình duyệt giữ dữ liệu lâu dài. Chrome/Edge/Safari tự quyết, Firefox có thể hỏi người dùng. */
export async function requestPersist(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

/** Đang chạy như ứng dụng đã cài (màn hình chính) */
export function isInstalled(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/* ------------------------------ Mã sao lưu ------------------------------ */

/** Cài đặt được mang theo khi sao lưu (bỏ cờ phát triển unlockAll) */
const SETTINGS_KEYS: (keyof Settings)[] = [
  'pieceStyle',
  'boardSkin',
  'fxTier',
  'sound',
  'vibrate',
  'coordinates',
  'notation',
  'effects',
  'showHints',
  'autoFlipHotseat',
  'patternBanners',
  'trainingLevel',
  'evalBar',
  'premove',
  'lang',
];

export interface BackupPayload {
  /** Phiên bản định dạng */
  v: 1;
  /** Thời điểm tạo (ms) */
  t: number;
  progress: ProgressData;
  patterns: Record<string, number>;
  settings: Partial<Settings>;
}

const PREFIX_DEFLATE = 'CC2.';
const PREFIX_PLAIN = 'CC1.';

function toB64Url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
/** Tổng kiểm tra ngắn để phát hiện mã chép thiếu/sai */
function checksum(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).slice(-4).padStart(4, '0');
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** Gói dữ liệu hiện tại trên máy này */
export function currentPayload(): BackupPayload {
  const s = useSettings.getState();
  const settings: Partial<Settings> = {};
  for (const k of SETTINGS_KEYS) (settings as Record<string, unknown>)[k] = s[k];
  return {
    v: 1,
    t: Date.now(),
    progress: useProgress.getState().progress,
    patterns: useProgress.getState().seenPatterns,
    settings,
  };
}

/** Tạo mã sao lưu dạng "CC2.<dữ liệu>.<kiểm tra>" */
export async function exportBackup(): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(currentPayload()));
  let body: string;
  let prefix: string;
  if (typeof CompressionStream !== 'undefined') {
    body = toB64Url(await pipe(json, new CompressionStream('deflate-raw')));
    prefix = PREFIX_DEFLATE;
  } else {
    body = toB64Url(json);
    prefix = PREFIX_PLAIN;
  }
  save('np.backupAt', Date.now());
  return `${prefix}${body}.${checksum(body)}`;
}

/** Đọc mã sao lưu; ném lỗi tiếng Việt nếu mã sai */
export async function parseBackup(code: string): Promise<BackupPayload> {
  const clean = code.replace(/\s+/g, '');
  const m = /^(CC[12])\.([A-Za-z0-9_-]+)\.([a-z0-9]{4})$/.exec(clean);
  if (!m) throw new Error('Mã không đúng định dạng. Mã sao lưu bắt đầu bằng "CC2." hoặc "CC1."');
  const [, kind, body, sum] = m;
  if (checksum(body!) !== sum) throw new Error('Mã bị thiếu hoặc sai ký tự. Hãy chép lại toàn bộ mã.');
  let bytes = fromB64Url(body!);
  if (kind === 'CC2') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Trình duyệt này quá cũ để đọc mã sao lưu. Hãy cập nhật trình duyệt.');
    bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  }
  let data: BackupPayload;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes)) as BackupPayload;
  } catch {
    throw new Error('Không đọc được nội dung mã sao lưu.');
  }
  if (data?.v !== 1 || typeof data.progress !== 'object') throw new Error('Mã sao lưu không hợp lệ.');
  return data;
}

/**
 * Khôi phục bằng cách GỘP với dữ liệu đang có (lấy giá trị lớn hơn, hợp thành tựu):
 * không bao giờ làm mất trận thắng hay mở khoá trên máy này.
 */
export function applyBackup(data: BackupPayload) {
  const p = { ...EMPTY_PROGRESS, ...data.progress, aiWins: { ...(data.progress.aiWins ?? {}) }, achievements: [...(data.progress.achievements ?? [])] };
  useProgress.getState().mergeFromServer(p);
  // Thế cờ đã gặp: lấy số lần lớn hơn
  const seen = { ...useProgress.getState().seenPatterns };
  for (const [id, n] of Object.entries(data.patterns ?? {})) seen[id] = Math.max(seen[id] ?? 0, Number(n) || 0);
  save('np.patterns', seen);
  useProgress.setState({ seenPatterns: seen });
  // Cài đặt: dùng theo bản sao lưu
  const patch: Partial<Settings> = {};
  for (const k of SETTINGS_KEYS) if (data.settings && k in data.settings) (patch as Record<string, unknown>)[k] = (data.settings as Record<string, unknown>)[k];
  useSettings.getState().update(patch);
}

/** Thời điểm tạo mã sao lưu gần nhất trên máy này (ms), 0 nếu chưa có */
export function lastBackupAt(): number {
  // load() gộp kiểu object nên không dùng được cho số: đọc chuỗi thô
  const n = Number(loadRaw('np.backupAt'));
  return Number.isFinite(n) ? n : 0;
}

/** Tải mã sao lưu về máy dưới dạng file .txt */
export function downloadBackup(code: string) {
  const d = new Date();
  const name = `cuu-cung-sao-luu-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.txt`;
  const text = `Mã sao lưu Cửu Cung (Hồ sơ → Khôi phục):\n\n${code}\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
