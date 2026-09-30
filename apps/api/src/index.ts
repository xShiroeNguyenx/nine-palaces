import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { ROOM_CODE_RE, type CreateRoomResponse, type MeResponse, type RatingMode } from '@np/shared';
import { ProgressSchema, RoomSettingsSchema } from '@np/shared/schemas';
import { USER_HEADER, encodeUserHeader, type Env } from './env';
import { authRoutes, authenticate } from './auth';
import {
  getMatch,
  getProgress,
  getRatings,
  getUser,
  leaderboard,
  mergeAndSaveProgress,
  renameUser,
  toPublicUser,
  userMatches,
} from './lib/db';
import { createRoom, roomStub, seatsForCreator } from './lib/rooms';

export { RoomDO } from './do/RoomDO';
export { LobbyDO } from './do/LobbyDO';

const app = new Hono<{ Bindings: Env }>();

function allowedOrigins(env: Env): string[] {
  return env.WEB_ORIGIN.split(',').map((s) => s.trim());
}

app.use('/api/*', async (c, next) => {
  const origins = allowedOrigins(c.env);
  return cors({
    origin: (o) => (origins.includes(o) ? o : origins[0]!),
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })(c, next);
});

app.get('/', (c) => c.text('Nine Palaces API'));
app.get('/api/health', (c) => c.json({ ok: true, time: Date.now() }));

app.route('/api/auth', authRoutes);

/* ------------------------------- Hồ sơ ------------------------------- */

app.get('/api/me', async (c) => {
  const me = await authenticate(c);
  if (!me) return c.json({ error: 'unauthorized' }, 401);
  const user = await getUser(c.env.DB, me.id);
  if (!user) return c.json({ error: 'not_found' }, 404);
  const [ratings, progress] = await Promise.all([getRatings(c.env.DB, me.id), getProgress(c.env.DB, me.id)]);
  const body: MeResponse = { user: toPublicUser(user, true), ratings, progress };
  return c.json(body);
});

app.patch('/api/me', async (c) => {
  const me = await authenticate(c);
  if (!me) return c.json({ error: 'unauthorized' }, 401);
  const body = z.object({ name: z.string().trim().min(1).max(24) }).safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: 'bad_request' }, 400);
  await renameUser(c.env.DB, me.id, body.data.name);
  return c.json({ ok: true });
});

/** Đồng bộ tiến trình local lên server (hợp nhất, không thu hồi) */
app.put('/api/me/progress', async (c) => {
  const me = await authenticate(c);
  if (!me) return c.json({ error: 'unauthorized' }, 401);
  const body = ProgressSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: 'bad_request' }, 400);
  return c.json(await mergeAndSaveProgress(c.env.DB, me.id, body.data));
});

app.get('/api/me/matches', async (c) => {
  const me = await authenticate(c);
  if (!me) return c.json({ error: 'unauthorized' }, 401);
  return c.json(await userMatches(c.env.DB, me.id));
});

app.get('/api/matches/:id', async (c) => {
  const m = await getMatch(c.env.DB, c.req.param('id'));
  return m ? c.json(m) : c.json({ error: 'not_found' }, 404);
});

/** Phản hồi (báo nhận diện thế cờ sai…) — giới hạn độ dài, không cần đăng nhập */
app.post('/api/feedback', async (c) => {
  const me = await authenticate(c);
  const body = z
    .object({ kind: z.enum(['pattern', 'bug', 'other']), subject: z.string().min(1).max(60), note: z.string().max(500).optional() })
    .safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: 'bad_request' }, 400);
  await c.env.DB.prepare('INSERT INTO feedback (id, user_id, kind, subject, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), me?.id ?? null, body.data.kind, body.data.subject, body.data.note ?? null, Date.now())
    .run();
  return c.json({ ok: true });
});

app.get('/api/leaderboard', async (c) => {
  const mode = (c.req.query('mode') ?? 'blitz') as RatingMode;
  if (!['bullet', 'blitz', 'rapid'].includes(mode)) return c.json({ error: 'bad_mode' }, 400);
  return c.json(await leaderboard(c.env.DB, mode));
});

/* ------------------------------- Phòng ------------------------------- */

app.post('/api/rooms', async (c) => {
  const me = await authenticate(c);
  if (!me) return c.json({ error: 'unauthorized' }, 401);
  const body = RoomSettingsSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: 'bad_request', details: body.error.flatten() }, 400);
  const settings = body.data;
  if (settings.rated && me.isGuest) {
    return c.json({ error: 'login_required', message: 'Ván xếp hạng yêu cầu đăng nhập Google' }, 403);
  }
  // Luyện Trình bị cấm ở ván xếp hạng
  if (settings.rated) settings.training = false;
  const seat = { userId: me.id, name: me.name, isGuest: me.isGuest, avatar: me.avatar, elo: null };
  const { code, key } = await createRoom(c.env, settings, seatsForCreator(settings.side, seat));
  const res: CreateRoomResponse = { code, key, joinPath: `/j/${code}${key ? `?k=${key}` : ''}` };
  return c.json(res);
});

app.get('/api/rooms/public', async (c) => {
  const lobby = c.env.LOBBY.get(c.env.LOBBY.idFromName('main'));
  return new Response((await lobby.fetch('https://lobby/rooms')).body, {
    headers: { 'Content-Type': 'application/json' },
  });
});

app.get('/api/rooms/:code', async (c) => {
  const code = c.req.param('code').toUpperCase();
  if (!ROOM_CODE_RE.test(code)) return c.json({ error: 'bad_code' }, 400);
  const k = c.req.query('k');
  const res = await roomStub(c.env, code).fetch(`https://room/info${k ? `?k=${encodeURIComponent(k)}` : ''}`);
  return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json' } });
});

function originAllowed(env: Env, origin: string | undefined): boolean {
  if (!origin) return true; // client không phải trình duyệt (ví dụ test)
  return allowedOrigins(env).includes(origin);
}

app.get('/api/rooms/:code/ws', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') return c.text('Expected websocket', 426);
  if (!originAllowed(c.env, c.req.header('Origin'))) return c.text('Origin not allowed', 403);
  const me = await authenticate(c);
  if (!me) return c.text('Unauthorized', 401);
  const code = c.req.param('code').toUpperCase();
  if (!ROOM_CODE_RE.test(code)) return c.text('Bad code', 400);
  const url = new URL(c.req.url);
  const target = new URL('https://room/ws');
  for (const k of ['as', 'k']) {
    const v = url.searchParams.get(k);
    if (v) target.searchParams.set(k, v);
  }
  const headers = new Headers(c.req.raw.headers);
  headers.set(USER_HEADER, encodeUserHeader(me));
  return roomStub(c.env, code).fetch(new Request(target.toString(), { headers }));
});

app.get('/api/lobby/ws', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') return c.text('Expected websocket', 426);
  if (!originAllowed(c.env, c.req.header('Origin'))) return c.text('Origin not allowed', 403);
  const me = await authenticate(c);
  if (!me) return c.text('Unauthorized', 401);
  const headers = new Headers(c.req.raw.headers);
  headers.set(USER_HEADER, encodeUserHeader(me));
  const lobby = c.env.LOBBY.get(c.env.LOBBY.idFromName('main'));
  return lobby.fetch(new Request('https://lobby/ws', { headers }));
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal', message: err.message }, 500);
});

export default app;
