import { DurableObject } from 'cloudflare:workers';
import { Game, INITIAL_FEN, shuffleJieqi, type GameResult } from '@np/rules';
import { ClientMessageSchema } from '@np/shared/schemas';
import {
  ratingModeOf,
  type ChatMessage,
  type ClientMessage,
  type ClockState,
  type PlayerInfo,
  type PublicRoomSummary,
  type RoomSettings,
  type RoomState,
  type RoomStatus,
  type ServerMessage,
  type SideName,
} from '@np/shared';
import { USER_HEADER, decodeUserHeader, type AuthUser, type Env } from '../env';
import { applyOnlineOutcome, applyRating, getElo, insertMatch } from '../lib/db';
import { filterChat } from '../lib/chat';

const DISCONNECT_GRACE_MS = 60_000;
const WAITING_TTL_MS = 10 * 60_000;
const IDLE_TTL_MS = 30 * 60_000;
const ENDED_TTL_MS = 30 * 60_000;
const SPECTATOR_DELAY = 3;
const CHAT_KEEP = 50;
const CHAT_INTERVAL_MS = 700;

export interface Seat {
  userId: string;
  name: string;
  isGuest: boolean;
  avatar: string | null;
  elo: number | null;
}

interface ClockData {
  red: number;
  black: number;
  turnStartedAt: number | null;
}

export interface RoomData {
  code: string;
  key: string | null;
  settings: RoomSettings;
  createdAt: number;
  lastActivityAt: number;
  status: RoomStatus;
  seats: { red: Seat | null; black: Seat | null };
  ready: { red: boolean; black: boolean };
  startFen: string;
  moves: string[];
  clock: ClockData | null;
  result: GameResult | null;
  offers: { draw: SideName | null; undo: SideName | null; rematch: SideName | null };
  disconnectedAt: { red: number | null; black: number | null };
  gameNo: number;
  matchId: string | null;
  ratingDelta: { red: number; black: number } | null;
  startedAt: number | null;
  endedAt: number | null;
  spectatorsPeak: number;
  chat: ChatMessage[];
  /** Cờ úp: danh tính thật của quân úp (bí mật, không bao giờ gửi cho client) */
  identity: number[] | null;
}

export interface RoomInitBody {
  code: string;
  key: string | null;
  settings: RoomSettings;
  seats: { red: Seat | null; black: Seat | null };
}

interface Attachment {
  userId: string;
  name: string;
  isGuest: boolean;
  role: SideName | 'spectator';
  lastChatAt: number;
}

const other = (s: SideName): SideName => (s === 'red' ? 'black' : 'red');

export class RoomDO extends DurableObject<Env> {
  private data: RoomData | null = null;
  private gameCache: { key: string; game: Game } | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.data = (await ctx.storage.get<RoomData>('room')) ?? null;
    });
  }

  /* ------------------------------------------------------------------ */
  /* HTTP nội bộ (chỉ Worker gọi)                                        */
  /* ------------------------------------------------------------------ */

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/init' && request.method === 'POST') return this.handleInit(request);
    if (url.pathname === '/info') return this.handleInfo(url);
    if (url.pathname === '/ws') return this.handleWs(request, url);
    return new Response('Not found', { status: 404 });
  }

  private async handleInit(request: Request): Promise<Response> {
    if (this.data && this.data.status !== 'closed') return Response.json({ error: 'exists' }, { status: 409 });
    const body = (await request.json()) as RoomInitBody;
    body.settings.variant = body.settings.variant ?? 'xiangqi';
    // Cờ úp chỉ chơi giao hữu (chưa có Elo riêng) và không có Luyện Trình
    if (body.settings.variant === 'jieqi') {
      body.settings.rated = false;
      body.settings.training = false;
    }
    const now = Date.now();
    const mode = ratingModeOf(body.settings.timeControl);
    for (const side of ['red', 'black'] as const) {
      const seat = body.seats[side];
      if (seat && body.settings.rated && !seat.isGuest) seat.elo = await getElo(this.env.DB, seat.userId, mode);
    }
    this.data = {
      code: body.code,
      key: body.key,
      settings: body.settings,
      createdAt: now,
      lastActivityAt: now,
      status: 'waiting',
      seats: body.seats,
      ready: { red: false, black: false },
      startFen: INITIAL_FEN,
      moves: [],
      clock: null,
      result: null,
      offers: { draw: null, undo: null, rematch: null },
      disconnectedAt: { red: null, black: null },
      gameNo: 0,
      matchId: null,
      ratingDelta: null,
      startedAt: null,
      endedAt: null,
      spectatorsPeak: 0,
      chat: [],
      identity: null,
    };
    await this.save();
    await this.scheduleAlarm();
    await this.notifyLobby();
    return Response.json({ ok: true });
  }

  private handleInfo(url: URL): Response {
    const d = this.data;
    if (!d || d.status === 'closed') return Response.json({ error: 'not_found' }, { status: 404 });
    const keyOk = !d.key || url.searchParams.get('k') === d.key;
    if (!keyOk) return Response.json({ error: 'forbidden' }, { status: 403 });
    return Response.json({
      code: d.code,
      status: d.status,
      settings: d.settings,
      red: d.seats.red ? { name: d.seats.red.name, userId: d.seats.red.userId } : null,
      black: d.seats.black ? { name: d.seats.black.name, userId: d.seats.black.userId } : null,
      moves: d.moves.length,
    });
  }

  private async handleWs(request: Request, url: URL): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
    const user = decodeUserHeader(request.headers.get(USER_HEADER));
    if (!user) return new Response('Unauthorized', { status: 401 });
    const d = this.data;
    if (!d || d.status === 'closed') return new Response('Room not found', { status: 404 });
    if (d.key && url.searchParams.get('k') !== d.key) return new Response('Forbidden', { status: 403 });

    const wantSpectate = url.searchParams.get('as') === 'spectator';
    let role: SideName | 'spectator' = 'spectator';
    let notice: ServerMessage | null = null;

    const seated = (['red', 'black'] as const).find((s) => d.seats[s]?.userId === user.id);
    if (seated) {
      role = seated;
      d.disconnectedAt[seated] = null;
      // cập nhật tên hiển thị mới nhất
      d.seats[seated]!.name = user.name;
    } else if (!wantSpectate && d.status === 'waiting') {
      const free = (['red', 'black'] as const).find((s) => !d.seats[s]);
      if (free) {
        if (d.settings.rated && user.isGuest) {
          notice = { type: 'error', code: 'login_required', message: 'Ván xếp hạng yêu cầu đăng nhập Google. Bạn đang ở chế độ xem.' };
        } else {
          d.seats[free] = await this.makeSeat(user);
          role = free;
        }
      }
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const att: Attachment = { userId: user.id, name: user.name, isGuest: user.isGuest, role, lastChatAt: 0 };
    this.ctx.acceptWebSocket(server, [role]);
    server.serializeAttachment(att);

    d.lastActivityAt = Date.now();
    const spectators = this.spectatorCount();
    d.spectatorsPeak = Math.max(d.spectatorsPeak, spectators);
    await this.save();
    await this.scheduleAlarm();

    this.send(server, { type: 'room:state', state: this.buildState(role) });
    this.send(server, { type: 'chat:history', messages: this.visibleChat(role) });
    if (notice) this.send(server, notice);
    this.broadcastState(server);
    if (role !== 'spectator') await this.notifyLobby();

    return new Response(null, { status: 101, webSocket: client });
  }

  private async makeSeat(user: AuthUser): Promise<Seat> {
    const d = this.data!;
    const elo =
      d.settings.rated && !user.isGuest ? await getElo(this.env.DB, user.id, ratingModeOf(d.settings.timeControl)) : null;
    return { userId: user.id, name: user.name, isGuest: user.isGuest, avatar: user.avatar, elo };
  }

  /* ------------------------------------------------------------------ */
  /* WebSocket (Hibernation API)                                         */
  /* ------------------------------------------------------------------ */

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const d = this.data;
    if (!d) return;
    let msg: ClientMessage;
    try {
      const parsed = ClientMessageSchema.safeParse(JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)));
      if (!parsed.success) {
        this.send(ws, { type: 'error', code: 'bad_request', message: 'Tin nhắn không hợp lệ' });
        return;
      }
      msg = parsed.data;
    } catch {
      this.send(ws, { type: 'error', code: 'bad_request', message: 'JSON không hợp lệ' });
      return;
    }
    const att = ws.deserializeAttachment() as Attachment;
    const role = att.role;
    const side = role === 'spectator' ? null : role;

    if (msg.type === 'clock:ping') {
      this.send(ws, { type: 'clock:pong', t: msg.t, serverNow: Date.now() });
      return;
    }
    if (msg.type === 'chat:send') {
      await this.handleChat(ws, att, msg.text, msg.emote ?? false);
      return;
    }
    if (!side) {
      this.send(ws, { type: 'error', code: 'spectator', message: 'Khán giả không thể thao tác ván cờ' });
      return;
    }
    d.lastActivityAt = Date.now();

    switch (msg.type) {
      case 'room:ready':
        return this.handleReady(ws, side, msg.ready);
      case 'game:move':
        return this.handleMove(ws, side, msg.seq, msg.move);
      case 'game:resign':
        if (d.status !== 'playing') return;
        return this.endGame({ winner: other(side), reason: 'resign' });
      case 'game:offerDraw':
        if (d.status !== 'playing' || d.offers.draw === side) return;
        if (d.offers.draw === other(side)) return this.endGame({ winner: 'draw', reason: 'draw_agreed' });
        d.offers.draw = side;
        await this.save();
        this.broadcast({ type: 'game:offer', kind: 'draw', by: side });
        this.broadcastState();
        return;
      case 'game:respondDraw':
        if (d.status !== 'playing' || d.offers.draw !== other(side)) return;
        if (msg.accept) return this.endGame({ winner: 'draw', reason: 'draw_agreed' });
        d.offers.draw = null;
        await this.save();
        this.broadcast({ type: 'game:offerDeclined', kind: 'draw', by: side });
        this.broadcastState();
        return;
      case 'game:requestUndo':
        if (d.status !== 'playing' || d.settings.rated || d.moves.length === 0) {
          this.send(ws, { type: 'error', code: 'undo_not_allowed', message: 'Không thể xin đi lại lúc này' });
          return;
        }
        d.offers.undo = side;
        await this.save();
        this.broadcast({ type: 'game:offer', kind: 'undo', by: side });
        this.broadcastState();
        return;
      case 'game:respondUndo':
        return this.handleUndoResponse(side, msg.accept);
      case 'game:rematch':
        return this.handleRematch(side);
      case 'game:claimAbandon':
        return this.checkAbandon();
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {
      /* đã đóng */
    }
    await this.onSocketGone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.onSocketGone(ws);
  }

  private async onSocketGone(ws: WebSocket): Promise<void> {
    const d = this.data;
    if (!d) return;
    const att = ws.deserializeAttachment() as Attachment | null;
    if (att && att.role !== 'spectator') {
      const stillHere = this.ctx
        .getWebSockets()
        .some((s) => s !== ws && s.readyState === WebSocket.OPEN && (s.deserializeAttachment() as Attachment).userId === att.userId);
      if (!stillHere) {
        if (d.status === 'playing') d.disconnectedAt[att.role] = Date.now();
        else if (d.status === 'waiting') d.ready[att.role] = false;
        await this.save();
        await this.scheduleAlarm();
      }
    }
    this.broadcastState(ws);
    this.broadcast({ type: 'spectator:count', n: this.spectatorCount() }, ws);
  }

  /* ------------------------------------------------------------------ */
  /* Xử lý ván cờ                                                        */
  /* ------------------------------------------------------------------ */

  private game(): Game {
    const d = this.data!;
    const key = `${d.gameNo}:${d.moves.join(',')}`;
    if (this.gameCache?.key === key) return this.gameCache.game;
    const g = Game.fromMoves(d.startFen, d.moves, {
      variant: d.settings.variant ?? 'xiangqi',
      identity: d.identity ? Int8Array.from(d.identity) : null,
    });
    if (d.result) g.setResult(d.result);
    this.gameCache = { key, game: g };
    return g;
  }

  private async handleReady(ws: WebSocket, side: SideName, ready: boolean): Promise<void> {
    const d = this.data!;
    if (d.status !== 'waiting') return;
    if (!d.seats.red || !d.seats.black) {
      d.ready[side] = ready;
      await this.save();
      this.broadcastState();
      if (ready) this.send(ws, { type: 'error', code: 'waiting_opponent', message: 'Đang chờ đối thủ vào phòng' });
      return;
    }
    d.ready[side] = ready;
    if (d.ready.red && d.ready.black) {
      await this.startGame();
      return;
    }
    await this.save();
    this.broadcastState();
  }

  private async startGame(): Promise<void> {
    const d = this.data!;
    const now = Date.now();
    d.status = 'playing';
    d.moves = [];
    d.result = null;
    d.offers = { draw: null, undo: null, rematch: null };
    d.disconnectedAt = { red: null, black: null };
    d.ratingDelta = null;
    d.matchId = null;
    d.gameNo += 1;
    d.startedAt = now;
    d.endedAt = null;
    d.ready = { red: false, black: false };
    const tc = d.settings.timeControl;
    d.clock = tc ? { red: tc.initialMs, black: tc.initialMs, turnStartedAt: now } : null;
    d.identity = d.settings.variant === 'jieqi' ? Array.from(shuffleJieqi()) : null;
    this.gameCache = null;
    await this.save();
    await this.scheduleAlarm();
    this.broadcastState();
    await this.notifyLobby();
  }

  private async handleMove(ws: WebSocket, side: SideName, seq: number, move: string): Promise<void> {
    const d = this.data!;
    if (d.status !== 'playing') {
      this.send(ws, { type: 'error', code: 'not_playing', message: 'Ván cờ chưa bắt đầu hoặc đã kết thúc' });
      return;
    }
    if (seq !== d.moves.length) {
      this.send(ws, { type: 'error', code: 'out_of_sync', message: 'Lệch trạng thái, đang đồng bộ lại' });
      this.send(ws, { type: 'room:state', state: this.buildState(side) });
      return;
    }
    const g = this.game();
    if (g.turn !== side) {
      this.send(ws, { type: 'error', code: 'not_your_turn', message: 'Chưa tới lượt bạn' });
      return;
    }
    const now = Date.now();
    // Đồng hồ: trừ thời gian của bên vừa đi
    if (d.clock && d.clock.turnStartedAt !== null) {
      const remaining = d.clock[side] - (now - d.clock.turnStartedAt);
      if (remaining <= 0) {
        d.clock[side] = 0;
        await this.endGame({ winner: other(side), reason: 'timeout' });
        return;
      }
      d.clock[side] = remaining + (d.settings.timeControl?.incrementMs ?? 0);
      d.clock.turnStartedAt = now;
    }
    const r = g.playIccs(move);
    if (!r.ok) {
      // hoàn lại đồng hồ không cần thiết vì nước không hợp lệ hiếm khi xảy ra với client chuẩn
      this.send(ws, { type: 'error', code: 'illegal_move', message: r.error });
      return;
    }
    d.moves.push(r.record.iccs);
    this.gameCache = { key: `${d.gameNo}:${d.moves.join(',')}`, game: g };
    d.offers.undo = null;
    d.offers.draw = d.offers.draw === side ? d.offers.draw : null;
    await this.save();

    const clock = this.clockState();
    const seqNo = d.moves.length - 1;
    const delayed = d.settings.rated;
    // Cờ úp: gửi kèm danh tính quân vừa lật / quân úp bị ăn
    const wire = g.annotated(r.record);
    for (const s of this.ctx.getWebSockets()) {
      const a = s.deserializeAttachment() as Attachment;
      if (a.role === 'spectator' && delayed) {
        this.send(s, { type: 'room:state', state: this.buildState('spectator') });
      } else {
        this.send(s, { type: 'game:moved', seq: seqNo, move: wire, vi: r.record.vi, clock, events: r.events });
      }
    }

    if (g.result) {
      await this.endGame(g.result);
      return;
    }
    await this.scheduleAlarm();
    if (d.moves.length % 10 === 0) await this.notifyLobby();
  }

  private async handleUndoResponse(side: SideName, accept: boolean): Promise<void> {
    const d = this.data!;
    const requester = d.offers.undo;
    if (d.status !== 'playing' || !requester || requester === side) return;
    d.offers.undo = null;
    if (!accept) {
      await this.save();
      this.broadcast({ type: 'game:offerDeclined', kind: 'undo', by: side });
      this.broadcastState();
      return;
    }
    const g = this.game();
    // Lùi về lượt của người xin: nếu nước cuối là của người xin → lùi 1, ngược lại lùi 2
    const lastSide = g.records[g.records.length - 1]?.side;
    const n = lastSide === requester ? 1 : 2;
    const undone = g.undo(Math.min(n, g.records.length));
    d.moves.splice(d.moves.length - undone, undone);
    this.gameCache = null;
    if (d.clock) d.clock.turnStartedAt = Date.now();
    await this.save();
    await this.scheduleAlarm();
    this.broadcastState();
  }

  private async handleRematch(side: SideName): Promise<void> {
    const d = this.data!;
    if (d.status !== 'ended' || !d.seats.red || !d.seats.black) return;
    if (d.offers.rematch === other(side)) {
      // Đổi màu quân rồi bắt đầu luôn
      const red = d.seats.red;
      d.seats.red = d.seats.black;
      d.seats.black = red;
      // Cập nhật vai trò trên các socket
      for (const s of this.ctx.getWebSockets()) {
        const a = s.deserializeAttachment() as Attachment;
        if (a.role === 'spectator') continue;
        const newRole: SideName = d.seats.red.userId === a.userId ? 'red' : 'black';
        s.serializeAttachment({ ...a, role: newRole });
      }
      // Tag của socket không đổi được sau khi accept → dùng attachment làm nguồn chính
      await this.startGame();
      return;
    }
    d.offers.rematch = side;
    await this.save();
    this.broadcast({ type: 'game:offer', kind: 'rematch', by: side });
    this.broadcastState();
  }

  private async checkAbandon(): Promise<void> {
    const d = this.data!;
    if (d.status !== 'playing') return;
    const now = Date.now();
    for (const s of ['red', 'black'] as const) {
      const at = d.disconnectedAt[s];
      if (at !== null && now - at >= DISCONNECT_GRACE_MS) {
        await this.endGame({ winner: other(s), reason: 'abandon' });
        return;
      }
    }
  }

  private async endGame(result: GameResult): Promise<void> {
    const d = this.data!;
    if (d.status !== 'playing') return;
    const now = Date.now();
    if (d.clock && d.clock.turnStartedAt !== null) {
      const running = this.game().turn;
      if (result.reason !== 'timeout') d.clock[running] = Math.max(0, d.clock[running] - (now - d.clock.turnStartedAt));
      d.clock.turnStartedAt = null;
    }
    d.status = 'ended';
    d.result = result;
    d.endedAt = now;
    d.offers = { draw: null, undo: null, rematch: null };
    d.disconnectedAt = { red: null, black: null };
    this.gameCache = null;

    const red = d.seats.red;
    const black = d.seats.black;
    const matchId = crypto.randomUUID();
    let ratingDelta: { red: number; black: number } | null = null;
    try {
      if (d.settings.rated && red && black && !red.isGuest && !black.isGuest && d.moves.length >= 2) {
        ratingDelta = await applyRating(this.env.DB, ratingModeOf(d.settings.timeControl), red.userId, black.userId, result.winner);
        red.elo = (red.elo ?? 1200) + ratingDelta.red;
        black.elo = (black.elo ?? 1200) + ratingDelta.black;
      }
      await insertMatch(this.env.DB, {
        id: matchId,
        variant: d.settings.variant ?? 'xiangqi',
        mode: 'online',
        rated: d.settings.rated,
        timeControl: d.settings.timeControl,
        roomCode: d.code,
        redId: red?.userId ?? null,
        blackId: black?.userId ?? null,
        redName: red?.name ?? '?',
        blackName: black?.name ?? '?',
        result: result.winner,
        reason: result.reason,
        startFen: d.startFen,
        moves: this.wireMoves(),
        startedAt: d.startedAt ?? now,
        endedAt: now,
        spectatorsPeak: d.spectatorsPeak,
        training: d.settings.training,
        redEloDelta: ratingDelta?.red ?? null,
        blackEloDelta: ratingDelta?.black ?? null,
      });
      if (red && black && d.moves.length >= 2) {
        const outcome = (s: SideName) => (result.winner === 'draw' ? 'draw' : result.winner === s ? 'win' : 'loss');
        await applyOnlineOutcome(this.env.DB, red.userId, outcome('red'));
        await applyOnlineOutcome(this.env.DB, black.userId, outcome('black'));
      }
      d.matchId = matchId;
    } catch (e) {
      console.error('Lưu kết quả ván thất bại', e);
    }
    d.ratingDelta = ratingDelta;
    await this.save();
    await this.scheduleAlarm();
    this.broadcast({ type: 'game:ended', result, ratingDelta, matchId: d.matchId });
    this.broadcastState();
    await this.notifyLobby();
  }

  /* ------------------------------------------------------------------ */
  /* Chat                                                                */
  /* ------------------------------------------------------------------ */

  private async handleChat(ws: WebSocket, att: Attachment, text: string, emote: boolean): Promise<void> {
    const d = this.data!;
    const now = Date.now();
    if (now - att.lastChatAt < CHAT_INTERVAL_MS) {
      this.send(ws, { type: 'error', code: 'rate_limited', message: 'Bạn nhắn quá nhanh' });
      return;
    }
    ws.serializeAttachment({ ...att, lastChatAt: now });
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      from: att.userId,
      fromName: att.name,
      text: emote ? text.slice(0, 8) : filterChat(text),
      channel: att.role === 'spectator' ? 'spectators' : 'players',
      at: now,
      emote,
    };
    d.chat.push(message);
    if (d.chat.length > CHAT_KEEP) d.chat.splice(0, d.chat.length - CHAT_KEEP);
    await this.save();
    for (const s of this.ctx.getWebSockets()) {
      const a = s.deserializeAttachment() as Attachment;
      if (this.canSeeChat(a.role, message)) this.send(s, { type: 'chat:message', message });
    }
  }

  /** Khán giả chỉ nhắn trong kênh khán giả; ván xếp hạng thì người chơi không thấy kênh khán giả */
  private canSeeChat(role: SideName | 'spectator', m: ChatMessage): boolean {
    if (m.channel === 'players') return true;
    if (role === 'spectator') return true;
    return !this.data!.settings.rated;
  }

  private visibleChat(role: SideName | 'spectator'): ChatMessage[] {
    return this.data!.chat.filter((m) => this.canSeeChat(role, m));
  }

  /* ------------------------------------------------------------------ */
  /* Alarm: hết giờ, bỏ cuộc, dọn phòng                                  */
  /* ------------------------------------------------------------------ */

  async alarm(): Promise<void> {
    const d = this.data;
    if (!d) return;
    const now = Date.now();
    if (d.status === 'playing') {
      if (d.clock && d.clock.turnStartedAt !== null) {
        const side = this.game().turn;
        if (d.clock[side] - (now - d.clock.turnStartedAt) <= 0) {
          d.clock[side] = 0;
          await this.endGame({ winner: other(side), reason: 'timeout' });
          return;
        }
      }
      await this.checkAbandon();
      if (this.data?.status === 'playing') await this.scheduleAlarm();
      return;
    }
    if (d.status === 'waiting') {
      const bothSeated = d.seats.red && d.seats.black;
      if ((!bothSeated && now - d.createdAt >= WAITING_TTL_MS && d.gameNo === 0) || now - d.lastActivityAt >= IDLE_TTL_MS) {
        await this.closeRoom();
        return;
      }
    }
    if (d.status === 'ended' && d.endedAt && now - Math.max(d.endedAt, d.lastActivityAt) >= ENDED_TTL_MS) {
      await this.closeRoom();
      return;
    }
    await this.scheduleAlarm();
  }

  private async scheduleAlarm(): Promise<void> {
    const d = this.data;
    if (!d || d.status === 'closed') return;
    const now = Date.now();
    const times: number[] = [];
    if (d.status === 'playing') {
      if (d.clock && d.clock.turnStartedAt !== null) {
        const side = this.game().turn;
        times.push(d.clock.turnStartedAt + d.clock[side] + 50);
      }
      for (const s of ['red', 'black'] as const) {
        const at = d.disconnectedAt[s];
        if (at !== null) times.push(at + DISCONNECT_GRACE_MS + 50);
      }
      // Nhịp kiểm tra an toàn
      times.push(now + IDLE_TTL_MS);
    } else if (d.status === 'waiting') {
      if (d.gameNo === 0 && !(d.seats.red && d.seats.black)) times.push(d.createdAt + WAITING_TTL_MS);
      times.push(d.lastActivityAt + IDLE_TTL_MS);
    } else if (d.status === 'ended' && d.endedAt) {
      times.push(Math.max(d.endedAt, d.lastActivityAt) + ENDED_TTL_MS);
    }
    if (times.length === 0) return;
    await this.ctx.storage.setAlarm(Math.max(now + 10, Math.min(...times)));
  }

  private async closeRoom(): Promise<void> {
    const d = this.data;
    if (!d) return;
    d.status = 'closed';
    this.broadcastState();
    for (const s of this.ctx.getWebSockets()) {
      try {
        s.close(1000, 'Phòng đã đóng');
      } catch {
        /* bỏ qua */
      }
    }
    await this.notifyLobby(true);
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    this.data = null;
  }

  /* ------------------------------------------------------------------ */
  /* Tiện ích                                                            */
  /* ------------------------------------------------------------------ */

  private async save(): Promise<void> {
    if (this.data) await this.ctx.storage.put('room', this.data);
  }

  private spectatorCount(): number {
    return this.ctx.getWebSockets('spectator').filter((s) => s.readyState === WebSocket.OPEN).length;
  }

  private roleOf(ws: WebSocket): SideName | 'spectator' {
    return (ws.deserializeAttachment() as Attachment).role;
  }

  private isConnected(side: SideName): boolean {
    const seat = this.data?.seats[side];
    if (!seat) return false;
    return this.ctx
      .getWebSockets()
      .some((s) => s.readyState === WebSocket.OPEN && (s.deserializeAttachment() as Attachment).userId === seat.userId);
  }

  private clockState(): ClockState | null {
    const d = this.data!;
    if (!d.clock) return null;
    const now = Date.now();
    let running: SideName | null = null;
    let red = d.clock.red;
    let black = d.clock.black;
    if (d.status === 'playing' && d.clock.turnStartedAt !== null) {
      running = this.game().turn;
      const elapsed = now - d.clock.turnStartedAt;
      if (running === 'red') red = Math.max(0, red - elapsed);
      else black = Math.max(0, black - elapsed);
    }
    return { red, black, running, serverNow: now };
  }

  private playerInfo(side: SideName): PlayerInfo | null {
    const s = this.data!.seats[side];
    if (!s) return null;
    return {
      userId: s.userId,
      name: s.name,
      isGuest: s.isGuest,
      avatar: s.avatar,
      elo: s.elo,
      connected: this.isConnected(side),
    };
  }

  private buildState(role: SideName | 'spectator'): RoomState {
    const d = this.data!;
    const delayed = role === 'spectator' && d.settings.rated && d.status === 'playing';
    const hidden = delayed ? Math.min(SPECTATOR_DELAY, d.moves.length) : 0;
    let perpetualWarning: RoomState['perpetualWarning'] = null;
    if (d.status === 'playing' && !delayed) {
      try {
        perpetualWarning = this.game().perpetualWarning;
      } catch {
        perpetualWarning = null;
      }
    }
    return {
      code: d.code,
      settings: d.settings,
      status: d.status,
      red: this.playerInfo('red'),
      black: this.playerInfo('black'),
      ready: d.ready,
      startFen: d.startFen,
      moves: hidden ? this.wireMoves().slice(0, d.moves.length - hidden) : this.wireMoves(),
      hiddenMoves: hidden,
      clock: d.status === 'closed' ? null : this.clockState(),
      result: d.result,
      offers: d.offers,
      perpetualWarning,
      spectators: this.spectatorCount(),
      you: role,
      gameNo: d.gameNo,
      matchId: d.matchId,
      ratingDelta: d.ratingDelta,
    };
  }

  /** Danh sách nước gửi ra ngoài (cờ úp: kèm chú thích lật quân) */
  private wireMoves(): string[] {
    const d = this.data!;
    if ((d.settings.variant ?? 'xiangqi') !== 'jieqi' || d.moves.length === 0) return d.moves;
    try {
      return this.game().movesIccs();
    } catch {
      return d.moves;
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* socket đã đóng */
    }
  }

  private broadcast(msg: ServerMessage, except?: WebSocket): void {
    const text = JSON.stringify(msg);
    for (const s of this.ctx.getWebSockets()) {
      if (s === except) continue;
      try {
        s.send(text);
      } catch {
        /* bỏ qua */
      }
    }
  }

  private broadcastState(except?: WebSocket): void {
    if (!this.data) return;
    for (const s of this.ctx.getWebSockets()) {
      if (s === except || s.readyState !== WebSocket.OPEN) continue;
      this.send(s, { type: 'room:state', state: this.buildState(this.roleOf(s)) });
    }
  }

  private async notifyLobby(remove = false): Promise<void> {
    const d = this.data;
    if (!d) return;
    const summary: PublicRoomSummary | null =
      remove || d.key || d.status === 'closed'
        ? null
        : {
            code: d.code,
            status: d.status,
            red: d.seats.red?.name ?? null,
            black: d.seats.black?.name ?? null,
            redElo: d.seats.red?.elo ?? null,
            blackElo: d.seats.black?.elo ?? null,
            rated: d.settings.rated,
            variant: d.settings.variant ?? 'xiangqi',
            timeControl: d.settings.timeControl,
            moves: d.moves.length,
            spectators: this.spectatorCount(),
            updatedAt: Date.now(),
          };
    try {
      const lobby = this.env.LOBBY.get(this.env.LOBBY.idFromName('main'));
      await lobby.fetch('https://lobby/update', { method: 'POST', body: JSON.stringify({ code: d.code, summary }) });
    } catch (e) {
      console.error('notifyLobby', e);
    }
  }
}
