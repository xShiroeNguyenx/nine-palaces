-- Nine Palaces: lược đồ ban đầu (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT UNIQUE,
  email TEXT,
  display_name TEXT NOT NULL,
  avatar TEXT,
  is_guest INTEGER NOT NULL DEFAULT 1,
  device_id TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_device ON users(device_id);

CREATE TABLE IF NOT EXISTS ratings (
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  elo INTEGER NOT NULL DEFAULT 1200,
  games INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, mode)
);
CREATE INDEX IF NOT EXISTS idx_ratings_mode_elo ON ratings(mode, elo DESC);

CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  unlock_wins INTEGER NOT NULL DEFAULT 0,
  ai_level_unlocked INTEGER NOT NULL DEFAULT 1,
  ai_wins TEXT NOT NULL DEFAULT '{}',
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  variant TEXT NOT NULL DEFAULT 'xiangqi',
  mode TEXT NOT NULL,
  rated INTEGER NOT NULL DEFAULT 0,
  time_control TEXT,
  room_code TEXT,
  red_id TEXT,
  black_id TEXT,
  red_name TEXT NOT NULL,
  black_name TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT NOT NULL,
  start_fen TEXT NOT NULL,
  moves TEXT NOT NULL,
  move_count INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  spectators_peak INTEGER NOT NULL DEFAULT 0,
  training INTEGER NOT NULL DEFAULT 0,
  red_elo_delta INTEGER,
  black_elo_delta INTEGER
);
CREATE INDEX IF NOT EXISTS idx_matches_red ON matches(red_id, ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_black ON matches(black_id, ended_at DESC);
