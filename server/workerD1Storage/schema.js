/**
 * Cloudflare D1 User-Partitioned Metadata Storage - Schema & Distributed Locks
 */

export const SAFE_CHUNK_SIZE = 1.8 * 1024 * 1024; // 1.8 MB safe operational limit

let userSchemaReady = false;

export async function ensureD1UserSchema(db) {
  if (!db || userSchemaReady) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_metadata_store (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        data_json TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        item_count INTEGER NOT NULL DEFAULT 0,
        is_closed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_user_metadata_user ON user_metadata_store(user_id, chunk_index ASC);
      CREATE INDEX IF NOT EXISTS idx_user_metadata_active ON user_metadata_store(user_id, is_closed, chunk_index DESC);
      CREATE TABLE IF NOT EXISTS recovery_locks (
        image_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        lock_token TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
    userSchemaReady = true;
  } catch (err) {
    console.error("[D1] Schema initialization error:", err);
  }
}

/**
 * Acquires an atomic distributed lease/lock in D1 on a specific image ID across all Worker instances.
 * Returns the lockToken on success, or null if lock is currently held by an active operation.
 */
export async function acquireD1RecoveryLock(db, imageId, userId, ttlSeconds = 30) {
  if (!db || !imageId || !userId) return null;
  try {
    await ensureD1UserSchema(db);
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);
    const lockToken = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `${now}_${Math.random()}`;

    // Clean expired locks older than 60s
    try {
      await db.prepare("DELETE FROM recovery_locks WHERE expires_at < ?").bind(now - 60000).run();
    } catch {}

    // 1. Try atomic insert of new lock
    try {
      const insertStmt = db.prepare(
        "INSERT INTO recovery_locks (image_id, user_id, lock_token, expires_at) VALUES (?, ?, ?, ?)"
      );
      const res = await insertStmt.bind(imageId, userId, lockToken, expiresAt).run();
      const changes = res?.meta?.changes ?? res?.changes ?? 0;
      if (res?.success || changes === 1) {
        return lockToken;
      }
    } catch (insertErr) {
      // Primary key conflict: check if existing lock has expired
      const updateStmt = db.prepare(
        "UPDATE recovery_locks SET user_id = ?, lock_token = ?, expires_at = ? WHERE image_id = ? AND expires_at < ?"
      );
      const res = await updateStmt.bind(userId, lockToken, expiresAt, imageId, now).run();
      const changes = res?.meta?.changes ?? res?.changes ?? 0;
      if (changes === 1) {
        return lockToken;
      }
    }
    return null; // Lock is actively held by another Worker
  } catch (err) {
    console.warn("[D1Lock] Error acquiring distributed lock:", err);
    return null;
  }
}

/**
 * Releases the atomic distributed recovery lease/lock in D1.
 */
export async function releaseD1RecoveryLock(db, imageId, lockToken) {
  if (!db || !imageId || !lockToken) return;
  try {
    const deleteStmt = db.prepare(
      "DELETE FROM recovery_locks WHERE image_id = ? AND lock_token = ?"
    );
    await deleteStmt.bind(imageId, lockToken).run();
  } catch (err) {
    console.warn("[D1Lock] Error releasing distributed lock:", err);
  }
}
