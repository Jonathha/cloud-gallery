/**
 * Ensures auth_verifications and user_devices schemas exist in D1.
 */
export async function ensureD1AuthSchema(db) {
  if (!db) return;
  try {
    await db.exec(`
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
    `);
  } catch (err) {
    console.error("[D1Auth] Schema error:", err);
  }
}

export async function saveAuthVerificationD1(db, emailKey, code, expiresAt, ip) {
  if (!db || !emailKey || !code) return false;
  await ensureD1AuthSchema(db);
  const now = Date.now();

  await db.prepare(`
    INSERT INTO auth_verifications (email_key, code, attempts, expires_at, ip, created_at, updated_at)
    VALUES (?, ?, 0, ?, ?, ?, ?)
    ON CONFLICT(email_key) DO UPDATE SET
      code = excluded.code,
      attempts = 0,
      expires_at = excluded.expires_at,
      ip = excluded.ip,
      updated_at = excluded.updated_at
  `).bind(emailKey, code, expiresAt, ip || null, now, now).run();

  return true;
}

export async function getAuthVerificationD1(db, emailKey) {
  if (!db || !emailKey) return null;
  await ensureD1AuthSchema(db);
  const row = await db.prepare("SELECT * FROM auth_verifications WHERE email_key = ?").bind(emailKey).first();
  if (!row) return null;
  return {
    emailKey: row.email_key,
    code: row.code,
    attempts: row.attempts,
    expiresAt: row.expires_at,
    ip: row.ip,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function updateAuthVerificationAttemptsD1(db, emailKey, attempts) {
  if (!db || !emailKey) return false;
  await ensureD1AuthSchema(db);
  const now = Date.now();
  await db.prepare("UPDATE auth_verifications SET attempts = ?, updated_at = ? WHERE email_key = ?").bind(attempts, now, emailKey).run();
  return true;
}

export async function deleteAuthVerificationD1(db, emailKey) {
  if (!db || !emailKey) return false;
  await ensureD1AuthSchema(db);
  await db.prepare("DELETE FROM auth_verifications WHERE email_key = ?").bind(emailKey).run();
  return true;
}

export async function registerUserDeviceD1(db, userId, token, platform = 'android') {
  if (!db || !userId || !token) return false;
  await ensureD1AuthSchema(db);
  const now = Date.now();
  await db.prepare(`
    INSERT INTO user_devices (user_id, token, platform, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, token) DO UPDATE SET
      platform = excluded.platform,
      updated_at = excluded.updated_at
  `).bind(userId, token, platform, now).run();
  return true;
}

export async function getUserDeviceTokensD1(db, userId) {
  if (!db || !userId) return [];
  await ensureD1AuthSchema(db);
  const rows = await db.prepare("SELECT token FROM user_devices WHERE user_id = ?").bind(userId).all();
  return rows?.results?.map(r => r.token) || [];
}
