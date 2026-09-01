-- Migration for Roulette on D1
CREATE TABLE IF NOT EXISTS roulette_users (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  spins_remaining INTEGER NOT NULL DEFAULT 3,
  total_spins INTEGER NOT NULL DEFAULT 0,
  last_activity INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS roulette_spins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT,
  reward_id INTEGER NOT NULL,
  reward_amount INTEGER NOT NULL,
  reward_label TEXT NOT NULL,
  reward_tier TEXT NOT NULL,
  strip_item_ids TEXT NOT NULL,
  jitter REAL NOT NULL,
  spins_remaining INTEGER NOT NULL,
  ip TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roulette_spins_user_id ON roulette_spins(user_id);
CREATE INDEX IF NOT EXISTS idx_roulette_spins_created_at ON roulette_spins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_users_last_activity ON roulette_users(last_activity DESC);
