/**
 * Kiểu dữ liệu & hằng số dùng chung (không phụ thuộc zod để gói web nhẹ).
 * Schema kiểm tra dữ liệu (zod) nằm ở `@np/shared/schemas` — chỉ server dùng.
 */
import type { GameEvent, GameResult } from '@np/rules';

export type SideName = 'red' | 'black';

/* ------------------------------------------------------------------ */
/* Cấu hình phòng                                                      */
/* ------------------------------------------------------------------ */

export type TimeControl = { initialMs: number; incrementMs: number } | null;

export const TIME_PRESETS: { id: string; label: string; tc: TimeControl }[] = [
  { id: '3+2', label: '3 phút + 2 giây', tc: { initialMs: 180_000, incrementMs: 2_000 } },
  { id: '5+3', label: '5 phút + 3 giây', tc: { initialMs: 300_000, incrementMs: 3_000 } },
  { id: '10+5', label: '10 phút + 5 giây', tc: { initialMs: 600_000, incrementMs: 5_000 } },
  { id: '15+10', label: '15 phút + 10 giây', tc: { initialMs: 900_000, incrementMs: 10_000 } },
  { id: 'none', label: 'Không giới hạn', tc: null },
];

export interface RoomSettings {
  timeControl: TimeControl;
  rated: boolean;
  private: boolean;
  side: 'red' | 'black' | 'random';
  /** Cho phép chế độ Luyện Trình (chỉ ván giao hữu, cả hai đồng ý khi vào phòng) */
  training: boolean;
  /** Biến thể: cờ tướng thường hoặc cờ úp (cờ úp chỉ giao hữu) */
  variant: 'xiangqi' | 'jieqi';
}
export type RoomSettingsInput = Omit<RoomSettings, 'variant'> & { variant?: RoomSettings['variant'] };

export type RatingMode = 'bullet' | 'blitz' | 'rapid';

export function ratingModeOf(tc: TimeControl): RatingMode {
  if (!tc) return 'rapid';
  const estimate = tc.initialMs + 40 * tc.incrementMs;
  if (estimate < 180_000) return 'bullet';
  if (estimate < 600_000) return 'blitz';
  return 'rapid';
}

/* ------------------------------------------------------------------ */
/* Trạng thái phòng gửi cho client                                     */
/* ------------------------------------------------------------------ */

export interface PlayerInfo {
  userId: string;
  name: string;
  isGuest: boolean;
  avatar?: string | null;
  elo?: number | null;
  connected: boolean;
}

export type RoomStatus = 'waiting' | 'playing' | 'ended' | 'closed';

export interface ClockState {
  red: number;
  black: number;
  /** Bên đang chạy đồng hồ (null nếu dừng) */
  running: SideName | null;
  /** Thời điểm server (ms) lúc chụp trạng thái — client tự nội suy */
  serverNow: number;
}

export interface RoomState {
  code: string;
  settings: RoomSettings;
  status: RoomStatus;
  red: PlayerInfo | null;
  black: PlayerInfo | null;
  ready: { red: boolean; black: boolean };
  startFen: string;
  /** Danh sách nước ICCS (khán giả ván xếp hạng có thể bị trễ vài nước) */
  moves: string[];
  /** Số nước bị giấu với khán giả (độ trễ chống mách nước) */
  hiddenMoves: number;
  clock: ClockState | null;
  result: GameResult | null;
  offers: { draw: SideName | null; undo: SideName | null; rematch: SideName | null };
  perpetualWarning: { side: SideName; count: number } | null;
  spectators: number;
  you: SideName | 'spectator';
  gameNo: number;
  matchId: string | null;
  ratingDelta: { red: number; black: number } | null;
}

export interface ChatMessage {
  id: string;
  from: string;
  fromName: string;
  text: string;
  channel: 'players' | 'spectators';
  at: number;
  emote?: boolean;
}

/* ------------------------------------------------------------------ */
/* Tin nhắn Client → Server                                            */
/* ------------------------------------------------------------------ */

export const EMOTES = ['👍', '😄', '😮', '😅', '🤔', '🔥', '👏', '🙏'] as const;

export type ClientMessage =
  | { type: 'room:ready'; ready: boolean }
  | { type: 'game:move'; seq: number; move: string }
  | { type: 'game:resign' }
  | { type: 'game:offerDraw' }
  | { type: 'game:respondDraw'; accept: boolean }
  | { type: 'game:requestUndo' }
  | { type: 'game:respondUndo'; accept: boolean }
  | { type: 'game:rematch' }
  | { type: 'game:claimAbandon' }
  | { type: 'chat:send'; text: string; emote?: boolean }
  | { type: 'clock:ping'; t: number };

/* ------------------------------------------------------------------ */
/* Tin nhắn Server → Client                                            */
/* ------------------------------------------------------------------ */

export type ServerMessage =
  | { type: 'room:state'; state: RoomState }
  | {
      type: 'game:moved';
      seq: number;
      move: string;
      vi: string;
      clock: ClockState | null;
      events: GameEvent[];
      /** true nếu là nước bị trễ gửi cho khán giả */
      delayed?: boolean;
    }
  | { type: 'game:ended'; result: GameResult; ratingDelta: { red: number; black: number } | null; matchId: string | null }
  | { type: 'game:offer'; kind: 'draw' | 'undo' | 'rematch'; by: SideName }
  | { type: 'game:offerDeclined'; kind: 'draw' | 'undo'; by: SideName }
  | { type: 'chat:message'; message: ChatMessage }
  | { type: 'chat:history'; messages: ChatMessage[] }
  | { type: 'spectator:count'; n: number }
  | { type: 'clock:pong'; t: number; serverNow: number }
  | { type: 'error'; code: string; message: string };

/* ------------------------------------------------------------------ */
/* REST                                                                */
/* ------------------------------------------------------------------ */

export interface PublicUser {
  id: string;
  name: string;
  isGuest: boolean;
  avatar: string | null;
  email?: string | null;
}

export interface ProgressData {
  xp: number;
  totalWins: number;
  unlockWins: number;
  aiLevelUnlocked: number;
  aiWins: Record<string, number>;
  streak: number;
  bestStreak: number;
  /** Mã thành tựu đã đạt (hợp nhất bằng phép hợp) */
  achievements: string[];
}

export const EMPTY_PROGRESS: ProgressData = {
  xp: 0,
  totalWins: 0,
  unlockWins: 0,
  aiLevelUnlocked: 1,
  aiWins: {},
  streak: 0,
  bestStreak: 0,
  achievements: [],
};

/** Hợp nhất tiến trình: không bao giờ thu hồi mở khóa */
export function mergeProgress(a: ProgressData, b: ProgressData): ProgressData {
  const aiWins: Record<string, number> = { ...a.aiWins };
  for (const [k, v] of Object.entries(b.aiWins)) aiWins[k] = Math.max(aiWins[k] ?? 0, v);
  return {
    xp: Math.max(a.xp, b.xp),
    totalWins: Math.max(a.totalWins, b.totalWins),
    unlockWins: Math.max(a.unlockWins, b.unlockWins),
    aiLevelUnlocked: Math.max(a.aiLevelUnlocked, b.aiLevelUnlocked),
    aiWins,
    streak: Math.max(a.streak, b.streak),
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    achievements: [...new Set([...(a.achievements ?? []), ...(b.achievements ?? [])])],
  };
}

export interface RatingRow {
  mode: RatingMode;
  elo: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface MeResponse {
  user: PublicUser;
  ratings: RatingRow[];
  progress: ProgressData;
}

export interface CreateRoomResponse {
  code: string;
  key: string | null;
  joinPath: string;
}

export interface PublicRoomSummary {
  code: string;
  status: RoomStatus;
  red: string | null;
  black: string | null;
  redElo: number | null;
  blackElo: number | null;
  rated: boolean;
  variant: 'xiangqi' | 'jieqi';
  timeControl: TimeControl;
  moves: number;
  spectators: number;
  updatedAt: number;
}

export interface MatchSummary {
  id: string;
  variant: 'xiangqi' | 'jieqi';
  rated: boolean;
  redName: string;
  blackName: string;
  redId: string | null;
  blackId: string | null;
  result: string;
  reason: string;
  moves: number;
  endedAt: number;
  timeControl: TimeControl;
}

export interface MatchDetail extends MatchSummary {
  startFen: string;
  movesList: string[];
}

export interface LeaderboardRow {
  userId: string;
  name: string;
  avatar: string | null;
  elo: number;
  games: number;
  wins: number;
}

/* ------------------------------------------------------------------ */
/* Ghép trận nhanh (Lobby WebSocket)                                   */
/* ------------------------------------------------------------------ */

export type LobbyClientMessage = { type: 'queue:join'; rated: boolean; timeControl: TimeControl } | { type: 'queue:leave' };

export type LobbyServerMessage =
  | { type: 'queue:joined'; position: number }
  | { type: 'queue:left' }
  | { type: 'match:found'; code: string; key: string | null }
  | { type: 'error'; code: string; message: string };

/** Bảng chữ cho mã phòng: bỏ O/0/I/1 để dễ đọc */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
