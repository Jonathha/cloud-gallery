/**
 * Ensures app_config_store schema exists in D1.
 */
export async function ensureD1ConfigSchema(db) {
  if (!db) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS app_config_store (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  } catch (err) {
    console.error("[D1Config] Schema error:", err);
  }
}

export async function getAppConfigD1(db, key = 'app') {
  if (!db) return null;
  await ensureD1ConfigSchema(db);
  const row = await db.prepare("SELECT value_json FROM app_config_store WHERE key = ?").bind(key).first();
  if (row && row.value_json) {
    try {
      return JSON.parse(row.value_json);
    } catch {}
  }
  // Default app config
  return {
    minVersion: "2.0",
    latestVersion: "2.1.0",
    maintenanceMode: false,
    apkUrl: "/api/update/download"
  };
}

export async function setAppConfigD1(db, key = 'app', configData = {}) {
  if (!db) return false;
  await ensureD1ConfigSchema(db);
  const now = Date.now();
  await db.prepare(`
    INSERT INTO app_config_store (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `).bind(key, JSON.stringify(configData), now).run();
  return true;
}
