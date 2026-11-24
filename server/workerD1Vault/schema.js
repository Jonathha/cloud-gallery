let vaultSchemaReady = false;

/**
 * Ensures user_vault_store and media_keys_store schemas exist in D1.
 */
export async function ensureD1VaultSchema(db) {
  if (!db || vaultSchemaReady) return;

  // 1. Ensure user_vault_store exists
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_vault_store (
      user_id TEXT PRIMARY KEY,
      salt TEXT NOT NULL DEFAULT '',
      verification TEXT NOT NULL DEFAULT '',
      vault_version INTEGER NOT NULL DEFAULT 1,
      opaque_record TEXT,
      encrypted_vault_key TEXT,
      key_wrapping_version INTEGER DEFAULT 1,
      encryption_mode TEXT DEFAULT 'standard',
      extra_password TEXT,
      extra_password_updated_at INTEGER DEFAULT 0,
      security_image_id_updated_at INTEGER DEFAULT 0,
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
    )
  `).run();

  // 2. Ensure media_keys_store exists
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS media_keys_store (
      image_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      salt TEXT,
      is_protected INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_media_keys_user ON media_keys_store(user_id)
  `).run();

  // 3. Inspect existing columns in user_vault_store via PRAGMA
  const tableInfo = await db.prepare("PRAGMA table_info(user_vault_store)").all();
  const existingCols = new Set(((tableInfo && tableInfo.results) || []).map(r => r.name));

  const columnsToAdd = [
    { name: "vault_version", sql: "ALTER TABLE user_vault_store ADD COLUMN vault_version INTEGER DEFAULT 1" },
    { name: "opaque_record", sql: "ALTER TABLE user_vault_store ADD COLUMN opaque_record TEXT" },
    { name: "encrypted_vault_key", sql: "ALTER TABLE user_vault_store ADD COLUMN encrypted_vault_key TEXT" },
    { name: "key_wrapping_version", sql: "ALTER TABLE user_vault_store ADD COLUMN key_wrapping_version INTEGER DEFAULT 1" },
    { name: "encryption_mode", sql: "ALTER TABLE user_vault_store ADD COLUMN encryption_mode TEXT DEFAULT 'standard'" },
    { name: "extra_password", sql: "ALTER TABLE user_vault_store ADD COLUMN extra_password TEXT" },
    { name: "extra_password_updated_at", sql: "ALTER TABLE user_vault_store ADD COLUMN extra_password_updated_at INTEGER DEFAULT 0" },
    { name: "security_image_id", sql: "ALTER TABLE user_vault_store ADD COLUMN security_image_id TEXT" },
    { name: "security_image_id_updated_at", sql: "ALTER TABLE user_vault_store ADD COLUMN security_image_id_updated_at INTEGER DEFAULT 0" },
    { name: "fake_vault_salt", sql: "ALTER TABLE user_vault_store ADD COLUMN fake_vault_salt TEXT" },
    { name: "fake_vault_verification", sql: "ALTER TABLE user_vault_store ADD COLUMN fake_vault_verification TEXT" },
    { name: "extra_password_salt", sql: "ALTER TABLE user_vault_store ADD COLUMN extra_password_salt TEXT" },
    { name: "extra_password_verification", sql: "ALTER TABLE user_vault_store ADD COLUMN extra_password_verification TEXT" },
    { name: "encrypted_share_recovery", sql: "ALTER TABLE user_vault_store ADD COLUMN encrypted_share_recovery TEXT" },
    { name: "used_storage", sql: "ALTER TABLE user_vault_store ADD COLUMN used_storage INTEGER DEFAULT 0" },
    { name: "theme", sql: "ALTER TABLE user_vault_store ADD COLUMN theme TEXT" },
    { name: "last_failed_password_at", sql: "ALTER TABLE user_vault_store ADD COLUMN last_failed_password_at INTEGER" },
  ];

  for (const col of columnsToAdd) {
    if (!existingCols.has(col.name)) {
      await db.prepare(col.sql).run();
      existingCols.add(col.name);
    }
  }

  vaultSchemaReady = true;
}

/**
 * Calculates lockout penalty in milliseconds based on failed attempts count.
 */
export function calculateLockoutPenalty(failedAttempts) {
  if (failedAttempts === 3) return 30 * 1000;
  if (failedAttempts === 4) return 60 * 1000;
  if (failedAttempts === 5) return 2 * 60 * 1000;
  if (failedAttempts === 6) return 5 * 60 * 1000;
  if (failedAttempts >= 7) return 24 * 60 * 60 * 1000;
  return 0;
}

/**
 * Atomically increments failed attempts and applies lockout penalty in D1.
 */
export async function recordVaultPenaltyD1(db, userId, isIntrusion = false) {
  if (!db || !userId) return { failedAttempts: 1, lockedUntil: null };
  await ensureD1VaultSchema(db);
  const now = Date.now();

  let resRow = null;

  if (isIntrusion) {
    const lock24h = now + (24 * 60 * 60 * 1000);
    const stmt = db.prepare(`
      INSERT INTO user_vault_store (user_id, salt, verification, failed_attempts, locked_until, last_failed_password_at, created_at, updated_at)
      VALUES (?, '', '', 7, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        failed_attempts = MAX(7, user_vault_store.failed_attempts + 1),
        locked_until = MAX(COALESCE(user_vault_store.locked_until, 0), excluded.locked_until),
        last_failed_password_at = excluded.last_failed_password_at,
        updated_at = excluded.updated_at
      RETURNING failed_attempts, locked_until;
    `);
    resRow = await stmt.bind(userId, lock24h, now, now, now).first();
  } else {
    const stmt = db.prepare(`
      INSERT INTO user_vault_store (user_id, salt, verification, failed_attempts, locked_until, last_failed_password_at, created_at, updated_at)
      VALUES (?, '', '', 1, NULL, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        failed_attempts = user_vault_store.failed_attempts + 1,
        last_failed_password_at = excluded.last_failed_password_at,
        locked_until = CASE
          WHEN (user_vault_store.failed_attempts + 1) = 3 THEN
            CASE WHEN COALESCE(user_vault_store.locked_until, 0) > excluded.updated_at THEN user_vault_store.locked_until ELSE excluded.updated_at + 30000 END
          WHEN (user_vault_store.failed_attempts + 1) = 4 THEN
            CASE WHEN COALESCE(user_vault_store.locked_until, 0) > excluded.updated_at THEN user_vault_store.locked_until ELSE excluded.updated_at + 60000 END
          WHEN (user_vault_store.failed_attempts + 1) = 5 THEN
            CASE WHEN COALESCE(user_vault_store.locked_until, 0) > excluded.updated_at THEN user_vault_store.locked_until ELSE excluded.updated_at + 120000 END
          WHEN (user_vault_store.failed_attempts + 1) = 6 THEN
            CASE WHEN COALESCE(user_vault_store.locked_until, 0) > excluded.updated_at THEN user_vault_store.locked_until ELSE excluded.updated_at + 300000 END
          WHEN (user_vault_store.failed_attempts + 1) >= 7 THEN
            CASE WHEN COALESCE(user_vault_store.locked_until, 0) > excluded.updated_at THEN user_vault_store.locked_until ELSE excluded.updated_at + 86400000 END
          ELSE
            CASE WHEN COALESCE(user_vault_store.locked_until, 0) > excluded.updated_at THEN user_vault_store.locked_until ELSE NULL END
        END,
        updated_at = excluded.updated_at
      RETURNING failed_attempts, locked_until;
    `);
    resRow = await stmt.bind(userId, now, now, now).first();
  }

  const failedAttempts = resRow?.failed_attempts ?? 1;
  const lockedUntil = resRow?.locked_until ?? null;

  return { failedAttempts, lockedUntil };
}

/**
 * Resets failed attempts to 0 in D1 upon successful unlock.
 * Rejects reset if user is currently locked out.
 */
export async function resetVaultPenaltyD1(db, userId) {
  if (!db || !userId) return { success: false, locked: false };
  await ensureD1VaultSchema(db);
  const now = Date.now();

  const current = await db.prepare("SELECT locked_until FROM user_vault_store WHERE user_id = ?").bind(userId).first();
  if (current && current.locked_until && now < current.locked_until) {
    return { success: false, locked: true, lockedUntil: current.locked_until };
  }

  await db.prepare(`
    UPDATE user_vault_store
    SET failed_attempts = 0, locked_until = NULL, updated_at = ?
    WHERE user_id = ?
  `).bind(now, userId).run();

  return { success: true, locked: false };
}
