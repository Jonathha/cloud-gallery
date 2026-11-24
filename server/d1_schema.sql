-- Cloudflare D1 Database Schema for Cloud Gallery
-- Clean relational storage for metadata, users, images, shares, and settings
-- NOTE: Physical encrypted media blobs remain stored in Cloudflare R2 (images/{id}.enc).

-- 1. Users metadata
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,               -- Firebase Auth UID
  email TEXT,
  display_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Images metadata
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,               -- Unique image/media ID
  user_id TEXT NOT NULL,             -- Owner UID (matches Firebase Auth)
  original_file_name TEXT,
  mime_type TEXT,
  file_size INTEGER DEFAULT 0,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  duration REAL DEFAULT 0,
  is_video INTEGER DEFAULT 0,
  is_protected INTEGER DEFAULT 0,
  r2_key TEXT NOT NULL,              -- e.g. 'images/{id}.enc'
  thumbnail_key TEXT,                -- e.g. 'thumbnails/{id}.enc'
  created_at INTEGER NOT NULL,
  uploaded_at TEXT,
  taken_at TEXT,
  updated_at INTEGER NOT NULL,
  extra_metadata_json TEXT           -- Flexible JSON field for auxiliary non-indexed metadata
);
CREATE INDEX IF NOT EXISTS idx_images_user_created ON images(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_user_protected ON images(user_id, is_protected);

-- 3. Shares metadata
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,               -- Share unique token/ID
  image_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  is_password_protected INTEGER DEFAULT 0,
  access_count INTEGER DEFAULT 0,
  max_views INTEGER,
  config_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_shares_image ON shares(image_id);
CREATE INDEX IF NOT EXISTS idx_shares_owner ON shares(owner_id);

-- 4. Active deterministic shares
CREATE TABLE IF NOT EXISTS active_shares (
  id TEXT PRIMARY KEY,               -- e.g. '{owner_id}_{image_id}'
  share_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_active_shares_owner ON active_shares(owner_id);

-- 5. Roulette Store (Preserved for compatibility)
CREATE TABLE IF NOT EXISTS roulette_store (
  id TEXT PRIMARY KEY,
  chunk_index INTEGER NOT NULL UNIQUE,
  data_json TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_roulette_store_active ON roulette_store(is_closed, chunk_index DESC);

-- 6. User-Partitioned Metadata Store (Safe Chunks ~1.8 MB per User)
-- Strictly holds application/media metadata organized by user.
-- NO physical media, Base64, Blobs, or .enc files are stored here.
CREATE TABLE IF NOT EXISTS user_metadata_store (
  id TEXT PRIMARY KEY,               -- e.g. '{userId}_chunk_{chunkIndex}'
  user_id TEXT NOT NULL,             -- Owner UID (matches Firebase Auth)
  chunk_index INTEGER NOT NULL,      -- 1, 2, 3...
  data_json TEXT NOT NULL,           -- JSON array of media metadata items
  byte_size INTEGER NOT NULL,        -- Byte size of data_json string
  item_count INTEGER NOT NULL DEFAULT 0,
  is_closed INTEGER NOT NULL DEFAULT 0, -- 0 = open for new items, 1 = sealed / reached safe limit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_metadata_user ON user_metadata_store(user_id, chunk_index ASC);
CREATE INDEX IF NOT EXISTS idx_user_metadata_active ON user_metadata_store(user_id, is_closed, chunk_index DESC);

-- 7. Recovery Locks
CREATE TABLE IF NOT EXISTS recovery_locks (
  image_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 8. User Vault Store
CREATE TABLE IF NOT EXISTS user_vault_store (
  user_id TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  verification TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  fake_vault_salt TEXT,
  fake_vault_verification TEXT,
  security_image_id TEXT,
  extra_password_salt TEXT,
  extra_password_verification TEXT,
  encrypted_share_recovery TEXT,
  used_storage INTEGER DEFAULT 0,
  theme TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 9. Media Keys Store
CREATE TABLE IF NOT EXISTS media_keys_store (
  image_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT,
  is_protected INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_keys_user ON media_keys_store(user_id);

-- 10. User Shares Store
CREATE TABLE IF NOT EXISTS user_shares_store (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  media_type TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_one_time INTEGER NOT NULL DEFAULT 0,
  deterministic_key TEXT NOT NULL,
  password_hash TEXT,
  encrypted_share_key TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_shares_owner ON user_shares_store(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_deterministic ON user_shares_store(deterministic_key);
CREATE INDEX IF NOT EXISTS idx_user_shares_image ON user_shares_store(image_id);

-- 11. App Config Store
CREATE TABLE IF NOT EXISTS app_config_store (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 12. Security Logs Store
CREATE TABLE IF NOT EXISTS security_logs_store (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  details_json TEXT,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_ts ON security_logs_store(user_id, timestamp DESC);

-- 13. Auth Verifications & Devices
CREATE TABLE IF NOT EXISTS auth_verifications (
  email_key TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  ip TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_verifications_expires ON auth_verifications(expires_at);

CREATE TABLE IF NOT EXISTS user_devices (
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'android',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, token)
);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);

