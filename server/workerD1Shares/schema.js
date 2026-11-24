const schemaReady = new WeakMap();

/**
 * Ensures the share schema once per isolate (the DDL below is idempotent but costs
 * a dozen D1 round-trips, which used to be paid on every share request).
 * Active links are limited per owner/media pair by a unique (deterministic_key, slot)
 * index: each active link owns one slot, so concurrent creates cannot exceed the cap.
 */
export function ensureD1SharesSchema(db) {
  if (!db) return Promise.reject(new Error("D1 database binding is required for share operations."));
  let pending = typeof db === "object" ? schemaReady.get(db) : null;
  if (!pending) {
    pending = runSchema(db).catch((err) => {
      if (typeof db === "object") schemaReady.delete(db);
      throw err;
    });
    if (typeof db === "object") schemaReady.set(db, pending);
  }
  return pending;
}

async function runSchema(db) {
  const statements = [
    "CREATE TABLE IF NOT EXISTS user_shares_store (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, image_id TEXT NOT NULL, media_type TEXT, status TEXT NOT NULL DEFAULT 'active', expires_at INTEGER, view_count INTEGER NOT NULL DEFAULT 0, is_one_time INTEGER NOT NULL DEFAULT 0, deterministic_key TEXT NOT NULL, password_hash TEXT, encrypted_share_key TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, allow_download INTEGER NOT NULL DEFAULT 1);",
    "CREATE INDEX IF NOT EXISTS idx_user_shares_owner ON user_shares_store(owner_id);",
    "CREATE INDEX IF NOT EXISTS idx_user_shares_deterministic ON user_shares_store(deterministic_key);",
    "CREATE INDEX IF NOT EXISTS idx_user_shares_image ON user_shares_store(image_id);",
    "CREATE TABLE IF NOT EXISTS share_access_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, share_id TEXT NOT NULL, viewer_ip TEXT NOT NULL, accessed_at INTEGER NOT NULL);",
    "CREATE INDEX IF NOT EXISTS idx_share_access_log ON share_access_logs(share_id, accessed_at);"
  ];
  for (const sql of statements) await db.prepare(sql).run();

  for (const sql of [
    "ALTER TABLE user_shares_store ADD COLUMN first_viewed_at INTEGER;",
    "ALTER TABLE user_shares_store ADD COLUMN first_viewer_ip TEXT;",
    "ALTER TABLE user_shares_store ADD COLUMN allow_download INTEGER NOT NULL DEFAULT 1;",
    "ALTER TABLE user_shares_store ADD COLUMN slot INTEGER NOT NULL DEFAULT 0;"
  ]) {
    try {
      await db.prepare(sql).run();
    } catch (err) {
      if (!String(err?.message || err).toLowerCase().includes("duplicate column")) throw err;
    }
  }

  // The legacy "one active link per media" index would reject the 2nd and 3rd link.
  await db.prepare("DROP INDEX IF EXISTS idx_user_shares_one_active_per_media").run();

  // Reassign distinct slots (0, 1, 2) to active rows sharing the same deterministic_key and expire excess active rows > 3
  try {
    const keysRes = await db.prepare("SELECT deterministic_key FROM user_shares_store WHERE status = 'active' GROUP BY deterministic_key HAVING COUNT(*) > 1").all();
    for (const row of (keysRes.results || [])) {
      const activeRes = await db.prepare("SELECT id FROM user_shares_store WHERE deterministic_key = ? AND status = 'active' ORDER BY created_at DESC").bind(row.deterministic_key).all();
      let slotIdx = 0;
      for (const r of (activeRes.results || [])) {
        if (slotIdx < 3) {
          await db.prepare("UPDATE user_shares_store SET slot = ? WHERE id = ?").bind(slotIdx++, r.id).run();
        } else {
          await db.prepare("UPDATE user_shares_store SET status = 'expired' WHERE id = ?").bind(r.id).run();
        }
      }
    }
  } catch (e) {
    console.warn("[D1Schema] Slot reassignment migration notice:", e);
  }

  // Legacy rows have slot 0 and at most one active row per key, so this cannot conflict.
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_user_shares_active_slot ON user_shares_store(deterministic_key, slot) WHERE status = 'active'").run();
}
