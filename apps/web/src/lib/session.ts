import { create } from 'zustand';
import type { MeResponse, PublicUser } from '@np/shared';
import { API_URL } from './config';
import { deviceId, loadRaw, remove, save } from './storage';

interface SessionState {
  token: string | null;
  user: PublicUser | null;
  me: MeResponse | null;
  setSession: (token: string, user: PublicUser | null) => void;
  setMe: (me: MeResponse | null) => void;
  logout: () => void;
}

function loadUser(): PublicUser | null {
  const raw = loadRaw('np.user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export const useSession = create<SessionState>((set) => ({
  token: loadRaw('np.token'),
  user: loadUser(),
  me: null,
  setSession: (token, user) => {
    save('np.token', token);
    if (user) save('np.user', user);
    set({ token, user: user ?? null });
  },
  setMe: (me) => {
    if (me) save('np.user', me.user);
    set((s) => ({ me, user: me?.user ?? s.user }));
  },
  logout: () => {
    remove('np.token');
    remove('np.user');
    set({ token: null, user: null, me: null });
  },
}));

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const token = auth ? await ensureToken() : null;
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, 'network', 'Không kết nối được máy chủ. Kiểm tra mạng hoặc thử lại sau.');
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string; message?: string }) | null;
  if (!res.ok) {
    if (res.status === 401 && auth) useSession.getState().logout();
    throw new ApiError(res.status, body?.error ?? 'error', body?.message ?? `Lỗi máy chủ (${res.status})`);
  }
  return body as T;
}

let pending: Promise<string> | null = null;

/** Lấy token; nếu chưa có thì đăng nhập khách bằng deviceId */
export async function ensureToken(): Promise<string> {
  const t = useSession.getState().token;
  if (t) return t;
  if (!pending) {
    pending = (async () => {
      let res: Response;
      try {
        res = await fetch(`${API_URL}/api/auth/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: deviceId() }),
        });
      } catch {
        throw new ApiError(0, 'network', 'Không kết nối được máy chủ. Kiểm tra mạng hoặc thử lại sau.');
      }
      if (!res.ok) throw new ApiError(res.status, 'guest_failed', 'Không tạo được phiên khách');
      const body = (await res.json()) as { token: string; user: PublicUser };
      useSession.getState().setSession(body.token, body.user);
      return body.token;
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}

export function googleLoginUrl(returnPath: string): string {
  const t = useSession.getState().token;
  const params = new URLSearchParams({ return: returnPath });
  if (t && useSession.getState().user?.isGuest) params.set('guest', t);
  return `${API_URL}/api/auth/google/start?${params}`;
}

export async function refreshMe(): Promise<MeResponse | null> {
  if (!useSession.getState().token) return null;
  try {
    const me = await api<MeResponse>('/api/me');
    useSession.getState().setMe(me);
    return me;
  } catch {
    return null;
  }
}

/** Cấp lại token sau khi đổi tên để tên mới đi kèm các phòng chơi */
export async function refreshToken(): Promise<void> {
  const r = await api<{ token: string; user: PublicUser }>('/api/auth/refresh', { method: 'POST' });
  useSession.getState().setSession(r.token, r.user);
}
