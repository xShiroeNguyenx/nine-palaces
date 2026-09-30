import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { Env, AuthUser } from './env';
import { b64urlDecode, randomString, sha256b64url, signToken, verifyToken } from './lib/jwt';
import {
  createUser,
  findGuestByDevice,
  getProgress,
  getUser,
  mergeAndSaveProgress,
  toPublicUser,
  touchUser,
  upsertGoogleUser,
} from './lib/db';

type Ctx = Context<{ Bindings: Env }>;

export function tokenFromRequest(c: Ctx): string | null {
  const h = c.req.header('Authorization');
  if (h?.startsWith('Bearer ')) return h.slice(7);
  return c.req.query('token') ?? null;
}

/** Xác thực JWT, trả về người dùng hoặc null */
export async function authenticate(c: Ctx): Promise<AuthUser | null> {
  const token = tokenFromRequest(c);
  if (!token || !c.env.JWT_SECRET) return null;
  const p = await verifyToken(token, c.env.JWT_SECRET);
  if (!p) return null;
  return { id: p.sub, name: p.name, isGuest: p.guest, avatar: p.avatar };
}

async function issueToken(env: Env, u: { id: string; display_name: string; is_guest: number; avatar: string | null }) {
  return signToken({ sub: u.id, name: u.display_name, guest: u.is_guest === 1, avatar: u.avatar }, env.JWT_SECRET);
}

const GuestSchema = z.object({
  deviceId: z.string().min(8).max(64),
  name: z.string().trim().min(1).max(24).optional(),
});

function randomGuestName(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `Khách-${n}`;
}

const OAUTH_COOKIE = 'np_oauth';

function cookieFlags(env: Env): string {
  const secure = env.API_ORIGIN.startsWith('https://') ? '; Secure' : '';
  return `; HttpOnly; Path=/api/auth; SameSite=Lax; Max-Age=600${secure}`;
}

function readCookie(c: Ctx, name: string): string | null {
  const raw = c.req.header('Cookie') ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

function firstWebOrigin(env: Env): string {
  return env.WEB_ORIGIN.split(',')[0]!.trim();
}

function safeReturnPath(p: string | undefined): string {
  return p && p.startsWith('/') && !p.startsWith('//') ? p : '/';
}

export const authRoutes = new Hono<{ Bindings: Env }>();

/** Đăng nhập khách theo deviceId (không cần tài khoản) */
authRoutes.post('/guest', async (c) => {
  const body = GuestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: 'bad_request' }, 400);
  let user = await findGuestByDevice(c.env.DB, body.data.deviceId);
  if (!user) user = await createUser(c.env.DB, { name: body.data.name ?? randomGuestName(), isGuest: true, deviceId: body.data.deviceId });
  else await touchUser(c.env.DB, user.id);
  return c.json({ token: await issueToken(c.env, user), user: toPublicUser(user) });
});

/** Đăng nhập thử khi phát triển (DEV_LOGIN=1): tạo tài khoản "đã đăng nhập" không cần Google */
authRoutes.post('/dev-login', async (c) => {
  if (c.env.DEV_LOGIN !== '1') return c.json({ error: 'disabled' }, 404);
  const body = z.object({ name: z.string().min(1).max(24) }).safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: 'bad_request' }, 400);
  const user = await upsertGoogleUser(c.env.DB, { sub: `dev:${body.data.name}`, email: null, name: body.data.name, avatar: null });
  return c.json({ token: await issueToken(c.env, user), user: toPublicUser(user) });
});

/** Bắt đầu đăng nhập Google (OAuth 2.0 + PKCE) */
authRoutes.get('/google/start', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.text('Đăng nhập Google chưa được cấu hình (thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).', 503);
  }
  const state = randomString(16);
  const verifier = randomString(48);
  const challenge = await sha256b64url(verifier);
  const payload = {
    state,
    verifier,
    ret: safeReturnPath(c.req.query('return')),
    guest: c.req.query('guest') ?? null,
  };
  const cookieVal = btoa(JSON.stringify(payload)).replace(/=+$/, '');
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${c.env.API_ORIGIN}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  c.header('Set-Cookie', `${OAUTH_COOKIE}=${cookieVal}${cookieFlags(c.env)}`);
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

authRoutes.get('/google/callback', async (c) => {
  const web = firstWebOrigin(c.env);
  const fail = (reason: string) => c.redirect(`${web}/auth/callback#error=${encodeURIComponent(reason)}`);
  const raw = readCookie(c, OAUTH_COOKIE);
  if (!raw) return fail('Phiên đăng nhập đã hết hạn, thử lại');
  let saved: { state: string; verifier: string; ret: string; guest: string | null };
  try {
    saved = JSON.parse(atob(raw));
  } catch {
    return fail('Cookie không hợp lệ');
  }
  if (c.req.query('state') !== saved.state) return fail('Sai state');
  const code = c.req.query('code');
  if (!code) return fail(c.req.query('error') ?? 'Không nhận được mã xác thực');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: `${c.env.API_ORIGIN}/api/auth/google/callback`,
      grant_type: 'authorization_code',
      code_verifier: saved.verifier,
    }),
  });
  if (!tokenRes.ok) return fail('Google từ chối mã xác thực');
  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) return fail('Thiếu id_token');
  // id_token nhận trực tiếp từ Google qua TLS nên chỉ cần kiểm tra aud/iss/exp
  const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(tokens.id_token.split('.')[1]!))) as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
    aud: string;
    iss: string;
    exp: number;
  };
  if (claims.aud !== c.env.GOOGLE_CLIENT_ID) return fail('Sai aud');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) return fail('Sai iss');
  if (claims.exp * 1000 < Date.now()) return fail('id_token hết hạn');

  const user = await upsertGoogleUser(c.env.DB, {
    sub: claims.sub,
    email: claims.email ?? null,
    name: (claims.name ?? claims.email?.split('@')[0] ?? 'Kỳ thủ').slice(0, 24),
    avatar: claims.picture ?? null,
  });

  // Hợp nhất tiến trình của tài khoản khách (nếu có) vào tài khoản Google
  if (saved.guest) {
    const g = await verifyToken(saved.guest, c.env.JWT_SECRET);
    if (g && g.guest && g.sub !== user.id) {
      await mergeAndSaveProgress(c.env.DB, user.id, await getProgress(c.env.DB, g.sub));
    }
  }

  const token = await issueToken(c.env, user);
  c.header('Set-Cookie', `${OAUTH_COOKIE}=; Max-Age=0; Path=/api/auth`);
  return c.redirect(`${web}/auth/callback#token=${encodeURIComponent(token)}&return=${encodeURIComponent(saved.ret)}`);
});

/** Cấp lại token (cập nhật tên hiển thị mới) */
authRoutes.post('/refresh', async (c) => {
  const me = await authenticate(c);
  if (!me) return c.json({ error: 'unauthorized' }, 401);
  const user = await getUser(c.env.DB, me.id);
  if (!user) return c.json({ error: 'not_found' }, 404);
  return c.json({ token: await issueToken(c.env, user), user: toPublicUser(user) });
});
