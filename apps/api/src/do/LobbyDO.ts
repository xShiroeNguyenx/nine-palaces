import { DurableObject } from 'cloudflare:workers';
import { LobbyClientSchema } from '@np/shared/schemas';
import {
  ratingModeOf,
  type LobbyServerMessage,
  type PublicRoomSummary,
  type TimeControl,
} from '@np/shared';
import { USER_HEADER, decodeUserHeader, type Env } from '../env';
import { getElo } from '../lib/db';
import { createRoom } from '../lib/rooms';

const MATCH_TICK_MS = 5_000;
const ROOM_STALE_MS = 3 * 3600_000;

interface QueueEntry {
  rated: boolean;
  timeControl: TimeControl;
  elo: number;
  since: number;
}

interface LobbyAttachment {
  userId: string;
  name: string;
  isGuest: boolean;
  avatar: string | null;
  queue: QueueEntry | null;
}

/** Sảnh chung: danh sách phòng công khai + hàng đợi ghép trận nhanh */
export class LobbyDO extends DurableObject<Env> {
  private rooms: Record<string, PublicRoomSummary> = {};

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.rooms = (await ctx.storage.get<Record<string, PublicRoomSummary>>('rooms')) ?? {};
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/update' && request.method === 'POST') {
      const { code, summary } = (await request.json()) as { code: string; summary: PublicRoomSummary | null };
      if (summary) this.rooms[code] = summary;
      else delete this.rooms[code];
      this.prune();
      await this.ctx.storage.put('rooms', this.rooms);
      return Response.json({ ok: true });
    }
    if (url.pathname === '/rooms') {
      this.prune();
      const list = Object.values(this.rooms).sort((a, b) => {
        if (a.status !== b.status) return a.status === 'playing' ? -1 : 1;
        return b.spectators - a.spectators || b.updatedAt - a.updatedAt;
      });
      return Response.json(list);
    }
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
      const user = decodeUserHeader(request.headers.get(USER_HEADER));
      if (!user) return new Response('Unauthorized', { status: 401 });
      const pair = new WebSocketPair();
      const att: LobbyAttachment = { userId: user.id, name: user.name, isGuest: user.isGuest, avatar: user.avatar, queue: null };
      this.ctx.acceptWebSocket(pair[1]);
      pair[1].serializeAttachment(att);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    return new Response('Not found', { status: 404 });
  }

  private prune(): void {
    const now = Date.now();
    for (const [code, r] of Object.entries(this.rooms)) if (now - r.updatedAt > ROOM_STALE_MS) delete this.rooms[code];
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let parsed;
    try {
      parsed = LobbyClientSchema.safeParse(JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)));
    } catch {
      return this.send(ws, { type: 'error', code: 'bad_request', message: 'JSON không hợp lệ' });
    }
    if (!parsed.success) return this.send(ws, { type: 'error', code: 'bad_request', message: 'Tin nhắn không hợp lệ' });
    const msg = parsed.data;
    const att = ws.deserializeAttachment() as LobbyAttachment;
    if (msg.type === 'queue:leave') {
      ws.serializeAttachment({ ...att, queue: null });
      return this.send(ws, { type: 'queue:left' });
    }
    if (msg.rated && att.isGuest) {
      return this.send(ws, { type: 'error', code: 'login_required', message: 'Ghép trận xếp hạng yêu cầu đăng nhập Google' });
    }
    const elo = msg.rated ? await getElo(this.env.DB, att.userId, ratingModeOf(msg.timeControl)) : 1200;
    ws.serializeAttachment({ ...att, queue: { rated: msg.rated, timeControl: msg.timeControl, elo, since: Date.now() } });
    const position = this.queued().length;
    this.send(ws, { type: 'queue:joined', position });
    await this.tryMatch();
    if (this.queued().length > 0) await this.ctx.storage.setAlarm(Date.now() + MATCH_TICK_MS);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {
      /* bỏ qua */
    }
  }

  async alarm(): Promise<void> {
    await this.tryMatch();
    if (this.queued().length > 0) await this.ctx.storage.setAlarm(Date.now() + MATCH_TICK_MS);
  }

  private queued(): { ws: WebSocket; att: LobbyAttachment }[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws.readyState === WebSocket.OPEN)
      .map((ws) => ({ ws, att: ws.deserializeAttachment() as LobbyAttachment }))
      .filter((x) => x.att.queue !== null)
      .sort((a, b) => a.att.queue!.since - b.att.queue!.since);
  }

  /** Biên Elo nới rộng dần: ±50 mỗi 5 giây, tối đa ±400 */
  private window(q: QueueEntry, now: number): number {
    return Math.min(400, 50 + 50 * Math.floor((now - q.since) / MATCH_TICK_MS));
  }

  private async tryMatch(): Promise<void> {
    const now = Date.now();
    const list = this.queued();
    const used = new Set<number>();
    for (let i = 0; i < list.length; i++) {
      if (used.has(i)) continue;
      const a = list[i]!;
      for (let j = i + 1; j < list.length; j++) {
        if (used.has(j)) continue;
        const b = list[j]!;
        const qa = a.att.queue!;
        const qb = b.att.queue!;
        if (a.att.userId === b.att.userId) continue;
        if (qa.rated !== qb.rated) continue;
        if (JSON.stringify(qa.timeControl) !== JSON.stringify(qb.timeControl)) continue;
        if (qa.rated && Math.abs(qa.elo - qb.elo) > Math.min(this.window(qa, now), this.window(qb, now))) continue;
        used.add(i);
        used.add(j);
        await this.pair(a, b, qa);
        break;
      }
    }
  }

  private async pair(
    a: { ws: WebSocket; att: LobbyAttachment },
    b: { ws: WebSocket; att: LobbyAttachment },
    q: QueueEntry,
  ): Promise<void> {
    const seat = (x: LobbyAttachment) => ({
      userId: x.userId,
      name: x.name,
      isGuest: x.isGuest,
      avatar: x.avatar,
      elo: x.queue?.elo ?? null,
    });
    const aRed = Math.random() < 0.5;
    try {
      const { code, key } = await createRoom(
        this.env,
        { timeControl: q.timeControl, rated: q.rated, private: false, side: 'random', training: false, variant: 'xiangqi' },
        aRed ? { red: seat(a.att), black: seat(b.att) } : { red: seat(b.att), black: seat(a.att) },
      );
      for (const x of [a, b]) {
        x.ws.serializeAttachment({ ...x.att, queue: null });
        this.send(x.ws, { type: 'match:found', code, key });
      }
    } catch (e) {
      console.error('Ghép trận lỗi', e);
    }
  }

  private send(ws: WebSocket, msg: LobbyServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* bỏ qua */
    }
  }
}
