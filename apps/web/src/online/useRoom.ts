import { useCallback, useEffect, useRef, useState } from 'react';
import { Game, iccsToMove, type GameEvent } from '@np/rules';
import type { ChatMessage, ClientMessage, RoomState, ServerMessage } from '@np/shared';
import { WS_URL } from '../lib/config';
import { ApiError, api, ensureToken } from '../lib/session';
import { playEvents, sfx } from '../lib/sound';

export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';

export interface RoomApi {
  state: RoomState | null;
  game: Game | null;
  version: number;
  chat: ChatMessage[];
  conn: ConnStatus;
  fatal: string | null;
  notice: { text: string; key: number } | null;
  events: { list: GameEvent[]; stamp: number };
  send: (msg: ClientMessage) => void;
  move: (iccs: string) => boolean;
  remaining: (side: 'red' | 'black') => number | null;
}

export function useRoom(code: string, key: string | null, asSpectator: boolean): RoomApi {
  const [state, setState] = useState<RoomState | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [conn, setConn] = useState<ConnStatus>('connecting');
  const [fatal, setFatal] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; key: number } | null>(null);
  const [events, setEvents] = useState<{ list: GameEvent[]; stamp: number }>({ list: [], stamp: 0 });
  const [version, setVersion] = useState(0);

  const gameRef = useRef<Game | null>(null);
  const stateRef = useRef<RoomState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const offsetRef = useRef(0);
  const retriesRef = useRef(0);
  const bump = () => setVersion((v) => v + 1);

  const showNotice = (text: string) => setNotice({ text, key: Date.now() });

  const applyState = (s: RoomState) => {
    stateRef.current = s;
    setState(s);
    try {
      const g = Game.fromMoves(s.startFen, s.moves, { variant: s.settings.variant ?? 'xiangqi' });
      if (s.result) g.setResult(s.result);
      gameRef.current = g;
    } catch (e) {
      console.error('Không dựng lại được ván', e);
    }
    if (s.clock) offsetRef.current = s.clock.serverNow - Date.now();
    bump();
  };

  const onMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'room:state': {
        const prev = stateRef.current;
        applyState(msg.state);
        if (prev && prev.status === 'waiting' && msg.state.status === 'playing') sfx.start();
        break;
      }
      case 'game:moved': {
        const g = gameRef.current;
        const s = stateRef.current;
        if (!g || !s) break;
        if (msg.clock) offsetRef.current = msg.clock.serverNow - Date.now();
        if (msg.seq < g.ply && g.records[msg.seq]?.iccs === msg.move.slice(0, 4)) {
          // Nước của mình đã áp dụng trước (optimistic) → chỉ cập nhật đồng hồ
          const next = { ...s, clock: msg.clock, offers: { ...s.offers, undo: null } };
          stateRef.current = next;
          setState(next);
          break;
        }
        if (msg.seq !== g.ply) {
          // Lệch trạng thái: đóng socket để kết nối lại lấy trạng thái đầy đủ
          wsRef.current?.close();
          break;
        }
        const r = g.playIccs(msg.move);
        if (!r.ok) {
          wsRef.current?.close();
          break;
        }
        const next: RoomState = {
          ...s,
          moves: [...s.moves, msg.move],
          clock: msg.clock,
          perpetualWarning: g.perpetualWarning,
          offers: { ...s.offers, undo: null },
        };
        stateRef.current = next;
        setState(next);
        setEvents({ list: msg.events, stamp: Date.now() });
        playEvents(msg.events, s.you === 'spectator' ? null : s.you);
        bump();
        break;
      }
      case 'game:ended': {
        const s = stateRef.current;
        if (s) {
          const next: RoomState = { ...s, status: 'ended', result: msg.result, ratingDelta: msg.ratingDelta, matchId: msg.matchId };
          stateRef.current = next;
          setState(next);
        }
        if (msg.result.reason !== 'checkmate') {
          const you = s?.you;
          if (msg.result.winner === 'draw') sfx.draw();
          else if (!you || you === 'spectator' || msg.result.winner === you) sfx.win();
          else sfx.lose();
        }
        break;
      }
      case 'game:offer': {
        const s = stateRef.current;
        if (s && s.you !== msg.by) {
          sfx.notify();
          const what = msg.kind === 'draw' ? 'cầu hòa' : msg.kind === 'undo' ? 'xin đi lại' : 'muốn đánh lại';
          showNotice(`${msg.by === 'red' ? 'Đỏ' : 'Đen'} ${what}`);
        }
        break;
      }
      case 'game:offerDeclined':
        showNotice(`Đề nghị ${msg.kind === 'draw' ? 'hòa' : 'đi lại'} bị từ chối`);
        break;
      case 'chat:history':
        setChat(msg.messages);
        break;
      case 'chat:message':
        setChat((c) => (c.some((m) => m.id === msg.message.id) ? c : [...c.slice(-99), msg.message]));
        break;
      case 'spectator:count': {
        const s = stateRef.current;
        if (s) {
          const next = { ...s, spectators: msg.n };
          stateRef.current = next;
          setState(next);
        }
        break;
      }
      case 'clock:pong':
        offsetRef.current = msg.serverNow - Date.now();
        break;
      case 'error':
        if (msg.code === 'out_of_sync' || msg.code === 'illegal_move') {
          // server sẽ gửi lại trạng thái; hoàn tác nước optimistic
          const s = stateRef.current;
          if (s) applyState(s);
        }
        if (msg.code !== 'out_of_sync') showNotice(msg.message);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Cờ riêng cho từng lần chạy effect: tránh mở 2 kết nối khi effect bị hủy lúc đang chờ mạng
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      if (!active) return;
      let token: string;
      try {
        token = await ensureToken();
        // Kiểm tra phòng trước để báo lỗi rõ ràng (WebSocket không trả mã lỗi HTTP)
        await api(`/api/rooms/${code}${key ? `?k=${encodeURIComponent(key)}` : ''}`, {}, false);
        if (!active) return;
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 403 || e.status === 400)) {
          setFatal(
            e.status === 403
              ? 'Phòng riêng: cần đường link hoặc mã QR đầy đủ để vào.'
              : 'Phòng không tồn tại hoặc đã đóng.',
          );
          setConn('error');
          return;
        }
        scheduleRetry();
        return;
      }
      const params = new URLSearchParams({ token });
      if (key) params.set('k', key);
      if (asSpectator) params.set('as', 'spectator');
      const ws = new WebSocket(`${WS_URL}/api/rooms/${code}/ws?${params}`);
      wsRef.current = ws;
      ws.onopen = () => {
        retriesRef.current = 0;
        setConn('open');
        ws.send(JSON.stringify({ type: 'clock:ping', t: Date.now() }));
      };
      ws.onmessage = (ev) => {
        try {
          onMessage(JSON.parse(ev.data as string) as ServerMessage);
        } catch (e) {
          console.error(e);
        }
      };
      ws.onclose = (ev) => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        if (!active) return;
        if (stateRef.current?.status === 'closed' || ev.code === 1000) {
          setConn('closed');
          return;
        }
        scheduleRetry();
      };
    };

    const scheduleRetry = () => {
      if (!active) return;
      retriesRef.current += 1;
      setConn('reconnecting');
      const delay = Math.min(8000, 500 * 2 ** Math.min(retriesRef.current, 4));
      timer = setTimeout(connect, delay);
    };

    setConn('connecting');
    void connect();

    const ping = setInterval(() => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'clock:ping', t: Date.now() }));
    }, 20_000);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !wsRef.current && active) {
        if (timer) clearTimeout(timer);
        void connect();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      clearInterval(ping);
      document.removeEventListener('visibilitychange', onVisible);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [code, key, asSpectator, onMessage]);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    else showNotice('Mất kết nối, đang thử lại…');
  }, []);

  /** Đi quân: áp dụng ngay trên máy mình rồi gửi lên server */
  const move = useCallback(
    (iccs: string): boolean => {
      const g = gameRef.current;
      const s = stateRef.current;
      if (!g || !s || s.status !== 'playing' || s.you === 'spectator' || g.turn !== s.you) return false;
      const seq = g.ply;
      if (g.variant === 'jieqi') {
        // Cờ úp: chưa biết quân lật ra là gì → chỉ gửi, chờ server trả về
        if (!g.legalMoves().some((m) => m === iccsToMove(iccs))) return false;
        send({ type: 'game:move', seq, move: iccs });
        return true;
      }
      const r = g.playIccs(iccs);
      if (!r.ok) return false;
      send({ type: 'game:move', seq, move: iccs });
      const next: RoomState = { ...s, moves: [...s.moves, iccs], perpetualWarning: g.perpetualWarning };
      stateRef.current = next;
      setState(next);
      setEvents({ list: r.events, stamp: Date.now() });
      playEvents(r.events, s.you);
      bump();
      return true;
    },
    [send],
  );

  const remaining = useCallback(
    (side: 'red' | 'black'): number | null => {
      const c = state?.clock;
      if (!c) return null;
      const base = c[side];
      if (c.running !== side || state?.status !== 'playing') return base;
      const serverNow = Date.now() + offsetRef.current;
      return Math.max(0, base - (serverNow - c.serverNow));
    },
    [state],
  );

  return { state, game: gameRef.current, version, chat, conn, fatal, notice, events, send, move, remaining };
}
