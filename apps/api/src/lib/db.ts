import {
  EMPTY_PROGRESS,
  mergeProgress,
  type LeaderboardRow,
  type MatchDetail,
  type MatchSummary,
  type ProgressData,
  type PublicUser,
  type RatingMode,
  type RatingRow,
  type TimeControl,
} from '@np/shared';

interface UserRow {
  id: string;
  google_sub: string | null;
  email: string | null;
  display_name: string;
  avatar: string | null;
  is_guest: number;
  device_id: string | null;
}

export function toPublicUser(r: UserRow, withEmail = false): PublicUser {
  return {
    id: r.id,
    name: r.display_name,
    isGuest: r.is_guest === 1,
    avatar: r.avatar,
    ...(withEmail ? { email: r.email } : {}),
  };
}

export async function getUser(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
}

export async function findGuestByDevice(db: D1Database, deviceId: string): Promise<UserRow | null> {
  return db
    .prepare('SELECT * FROM users WHERE device_id = ? AND is_guest = 1 ORDER BY created_at DESC LIMIT 1')
    .bind(deviceId)
    .first<UserRow>();
}

export async function createUser(
  db: D1Database,
  u: { name: string; isGuest: boolean; deviceId?: string | null; googleSub?: string | null; email?: string | null; avatar?: string | null },
): Promise<UserRow> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(
      'INSERT INTO users (id, google_sub, email, display_name, avatar, is_guest, device_id, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(id, u.googleSub ?? null, u.email ?? null, u.name, u.avatar ?? null, u.isGuest ? 1 : 0, u.deviceId ?? null, now, now)
    .run();
  return (await getUser(db, id))!;
}

export async function upsertGoogleUser(
  db: D1Database,
  g: { sub: string; email: string | null; name: string; avatar: string | null },
): Promise<UserRow> {
  const existing = await db.prepare('SELECT * FROM users WHERE google_sub = ?').bind(g.sub).first<UserRow>();
  if (existing) {
    await db
      .prepare('UPDATE users SET email = ?, avatar = ?, last_seen_at = ? WHERE id = ?')
      .bind(g.email, g.avatar, Date.now(), existing.id)
      .run();
    return (await getUser(db, existing.id))!;
  }
  return createUser(db, { name: g.name, isGuest: false, googleSub: g.sub, email: g.email, avatar: g.avatar });
}

export async function touchUser(db: D1Database, id: string): Promise<void> {
  await db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').bind(Date.now(), id).run();
}

export async function renameUser(db: D1Database, id: string, name: string): Promise<void> {
  await db.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(name, id).run();
}

/* ------------------------------- Tiến trình ------------------------------- */

interface ProgressRow {
  xp: number;
  total_wins: number;
  unlock_wins: number;
  ai_level_unlocked: number;
  ai_wins: string;
  streak: number;
  best_streak: number;
  achievements?: string;
}

export async function getProgress(db: D1Database, userId: string): Promise<ProgressData> {
  const r = await db.prepare('SELECT * FROM progress WHERE user_id = ?').bind(userId).first<ProgressRow>();
  if (!r) return { ...EMPTY_PROGRESS, aiWins: {}, achievements: [] };
  let aiWins: Record<string, number> = {};
  let achievements: string[] = [];
  try {
    aiWins = JSON.parse(r.ai_wins) as Record<string, number>;
    achievements = JSON.parse(r.achievements ?? '[]') as string[];
  } catch {
    /* bỏ qua */
  }
  return {
    xp: r.xp,
    totalWins: r.total_wins,
    unlockWins: r.unlock_wins,
    aiLevelUnlocked: r.ai_level_unlocked,
    aiWins,
    streak: r.streak,
    bestStreak: r.best_streak,
    achievements,
  };
}

export async function saveProgress(db: D1Database, userId: string, p: ProgressData): Promise<void> {
  await db
    .prepare(
      `INSERT INTO progress (user_id, xp, total_wins, unlock_wins, ai_level_unlocked, ai_wins, streak, best_streak, achievements, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET xp = excluded.xp, total_wins = excluded.total_wins,
         unlock_wins = excluded.unlock_wins, ai_level_unlocked = excluded.ai_level_unlocked,
         ai_wins = excluded.ai_wins, streak = excluded.streak, best_streak = excluded.best_streak,
         achievements = excluded.achievements, updated_at = excluded.updated_at`,
    )
    .bind(
      userId,
      p.xp,
      p.totalWins,
      p.unlockWins,
      p.aiLevelUnlocked,
      JSON.stringify(p.aiWins),
      p.streak,
      p.bestStreak,
      JSON.stringify(p.achievements ?? []),
      Date.now(),
    )
    .run();
}

export async function mergeAndSaveProgress(db: D1Database, userId: string, incoming: ProgressData): Promise<ProgressData> {
  const merged = mergeProgress(await getProgress(db, userId), incoming);
  await saveProgress(db, userId, merged);
  return merged;
}

/** Ghi nhận kết quả một ván online vào tiến trình */
export async function applyOnlineOutcome(db: D1Database, userId: string, outcome: 'win' | 'loss' | 'draw'): Promise<void> {
  const p = await getProgress(db, userId);
  if (outcome === 'win') {
    p.xp += 100;
    p.totalWins += 1;
    p.unlockWins += 1;
    p.streak += 1;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
  } else if (outcome === 'draw') {
    p.xp += 40;
  } else {
    p.xp += 15;
    p.streak = 0;
  }
  await saveProgress(db, userId, p);
}

/* -------------------------------- Xếp hạng -------------------------------- */

export async function getRatings(db: D1Database, userId: string): Promise<RatingRow[]> {
  const res = await db
    .prepare('SELECT mode, elo, games, wins, losses, draws FROM ratings WHERE user_id = ?')
    .bind(userId)
    .all<RatingRow>();
  return res.results;
}

export async function getElo(db: D1Database, userId: string, mode: RatingMode): Promise<number> {
  const r = await db
    .prepare('SELECT elo FROM ratings WHERE user_id = ? AND mode = ?')
    .bind(userId, mode)
    .first<{ elo: number }>();
  return r?.elo ?? 1200;
}

export const ELO_K = 32;

export function eloDelta(ra: number, rb: number, scoreA: number): number {
  const expected = 1 / (1 + Math.pow(10, (rb - ra) / 400));
  return Math.round(ELO_K * (scoreA - expected));
}

/** Cập nhật Elo cho 2 người, trả về thay đổi của mỗi bên */
export async function applyRating(
  db: D1Database,
  mode: RatingMode,
  redId: string,
  blackId: string,
  winner: 'red' | 'black' | 'draw',
): Promise<{ red: number; black: number }> {
  const [ra, rb] = await Promise.all([getElo(db, redId, mode), getElo(db, blackId, mode)]);
  const scoreRed = winner === 'red' ? 1 : winner === 'draw' ? 0.5 : 0;
  const dRed = eloDelta(ra, rb, scoreRed);
  const dBlack = eloDelta(rb, ra, 1 - scoreRed);
  const upsert = (id: string, elo: number, w: number, l: number, d: number) =>
    db
      .prepare(
        `INSERT INTO ratings (user_id, mode, elo, games, wins, losses, draws) VALUES (?, ?, ?, 1, ?, ?, ?)
         ON CONFLICT(user_id, mode) DO UPDATE SET elo = excluded.elo, games = games + 1,
           wins = wins + excluded.wins, losses = losses + excluded.losses, draws = draws + excluded.draws`,
      )
      .bind(id, mode, elo, w, l, d);
  await db.batch([
    upsert(redId, ra + dRed, winner === 'red' ? 1 : 0, winner === 'black' ? 1 : 0, winner === 'draw' ? 1 : 0),
    upsert(blackId, rb + dBlack, winner === 'black' ? 1 : 0, winner === 'red' ? 1 : 0, winner === 'draw' ? 1 : 0),
  ]);
  return { red: dRed, black: dBlack };
}

export async function leaderboard(db: D1Database, mode: RatingMode, limit = 50): Promise<LeaderboardRow[]> {
  const res = await db
    .prepare(
      `SELECT r.user_id AS userId, u.display_name AS name, u.avatar AS avatar, r.elo AS elo, r.games AS games, r.wins AS wins
       FROM ratings r JOIN users u ON u.id = r.user_id
       WHERE r.mode = ? AND u.is_guest = 0
       ORDER BY r.elo DESC LIMIT ?`,
    )
    .bind(mode, limit)
    .all<LeaderboardRow>();
  return res.results;
}

/* --------------------------------- Ván cờ --------------------------------- */

export interface MatchInsert {
  id: string;
  variant: string;
  mode: string;
  rated: boolean;
  timeControl: TimeControl;
  roomCode: string;
  redId: string | null;
  blackId: string | null;
  redName: string;
  blackName: string;
  result: string;
  reason: string;
  startFen: string;
  moves: string[];
  startedAt: number;
  endedAt: number;
  spectatorsPeak: number;
  training: boolean;
  redEloDelta: number | null;
  blackEloDelta: number | null;
}

export async function insertMatch(db: D1Database, m: MatchInsert): Promise<void> {
  await db
    .prepare(
      `INSERT INTO matches (id, variant, mode, rated, time_control, room_code, red_id, black_id, red_name, black_name,
        result, reason, start_fen, moves, move_count, started_at, ended_at, spectators_peak, training, red_elo_delta, black_elo_delta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      m.id,
      m.variant,
      m.mode,
      m.rated ? 1 : 0,
      JSON.stringify(m.timeControl),
      m.roomCode,
      m.redId,
      m.blackId,
      m.redName,
      m.blackName,
      m.result,
      m.reason,
      m.startFen,
      JSON.stringify(m.moves),
      m.moves.length,
      m.startedAt,
      m.endedAt,
      m.spectatorsPeak,
      m.training ? 1 : 0,
      m.redEloDelta,
      m.blackEloDelta,
    )
    .run();
}

interface MatchRow {
  id: string;
  variant: string;
  rated: number;
  time_control: string | null;
  red_id: string | null;
  black_id: string | null;
  red_name: string;
  black_name: string;
  result: string;
  reason: string;
  start_fen: string;
  moves: string;
  move_count: number;
  ended_at: number;
}

function rowToSummary(r: MatchRow): MatchSummary {
  return {
    id: r.id,
    variant: r.variant === 'jieqi' ? 'jieqi' : 'xiangqi',
    rated: r.rated === 1,
    redName: r.red_name,
    blackName: r.black_name,
    redId: r.red_id,
    blackId: r.black_id,
    result: r.result,
    reason: r.reason,
    moves: r.move_count,
    endedAt: r.ended_at,
    timeControl: r.time_control ? (JSON.parse(r.time_control) as TimeControl) : null,
  };
}

export async function userMatches(db: D1Database, userId: string, limit = 30): Promise<MatchSummary[]> {
  const res = await db
    .prepare('SELECT * FROM matches WHERE red_id = ? OR black_id = ? ORDER BY ended_at DESC LIMIT ?')
    .bind(userId, userId, limit)
    .all<MatchRow>();
  return res.results.map(rowToSummary);
}

export async function getMatch(db: D1Database, id: string): Promise<MatchDetail | null> {
  const r = await db.prepare('SELECT * FROM matches WHERE id = ?').bind(id).first<MatchRow>();
  if (!r) return null;
  return { ...rowToSummary(r), startFen: r.start_fen, movesList: JSON.parse(r.moves) as string[] };
}
