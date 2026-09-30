/** localStorage an toàn (chế độ riêng tư có thể ném lỗi) */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...(JSON.parse(raw) as T) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    /* bỏ qua */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* bỏ qua */
  }
}

/**
 * UUID v4. `crypto.randomUUID` chỉ có trong "secure context" (https hoặc localhost);
 * mở bằng http://192.168.x.x (điện thoại trong mạng LAN) thì phải tự tạo từ getRandomValues.
 */
function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function deviceId(): string {
  let id = loadRaw('np.device');
  if (!id) {
    id = uuid();
    save('np.device', id);
  }
  return id;
}
