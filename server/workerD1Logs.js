/**
 * Schema and log management for Cloudflare D1.
 * Supports granular indexed queries and unified structured JSON storage with 2MB chunk limits.
 */

const CHUNK_SIZE_LIMIT_BYTES = 1887436; // ~1.8 MB (Segurança antes do limite de 2 MB)

/**
 * Ensures D1 log tables and indexes exist.
 */
export async function ensureD1LogsSchema(db) {
  if (!db) return;
  try {
    // 1. Tabela granular indexada para consultas rápidas por evento e usuário
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS security_logs_store (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        details_json TEXT,
        timestamp INTEGER NOT NULL
      )
    `).run();

    await db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_security_logs_user_ts ON security_logs_store(user_id, timestamp DESC)"
    ).run();
    await db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_security_logs_type_ts ON security_logs_store(event_type, timestamp DESC)"
    ).run();

    // 2. Tabela de JSON Único Centralizado e particionado por usuário
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS user_logs_unified_store (
        user_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL DEFAULT 0,
        unified_json TEXT NOT NULL,
        byte_size INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, chunk_index)
      )
    `).run();
  } catch (err) {
    console.error("[D1Logs] Schema error:", err);
  }
}

/**
 * Saves a security / audit / access log entry in D1.
 * Persists to security_logs_store and appends to the unified JSON document per user.
 */
export async function saveSecurityLogD1(db, logEntry) {
  if (!db || !logEntry.id || !logEntry.userId) return false;
  await ensureD1LogsSchema(db);
  const now = logEntry.timestamp || Date.now();

  // Tratamento de firstAccess e accessCount para user_access
  if (logEntry.eventType === "user_access" && logEntry.details && typeof logEntry.details === "object") {
    try {
      const existing = await db.prepare("SELECT details_json FROM security_logs_store WHERE id = ?").bind(logEntry.id).first();
      if (existing && existing.details_json) {
        const prev = JSON.parse(existing.details_json);
        logEntry.details.firstAccess = prev.firstAccess || logEntry.details.firstAccess || now;
        logEntry.details.accessCount = (prev.accessCount || 1) + 1;
      }
    } catch {}
  }

  // 1. Grava na tabela granular
  await db.prepare(`
    INSERT INTO security_logs_store (id, user_id, event_type, ip, user_agent, details_json, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      event_type = excluded.event_type,
      ip = excluded.ip,
      user_agent = excluded.user_agent,
      details_json = excluded.details_json,
      timestamp = excluded.timestamp
  `).bind(
    logEntry.id,
    logEntry.userId,
    logEntry.eventType || "LOG",
    logEntry.ip || "0.0.0.0",
    logEntry.userAgent || "",
    logEntry.details ? JSON.stringify(logEntry.details) : null,
    now
  ).run();

  // 2. Atualiza o JSON Único Centralizado no user_logs_unified_store
  try {
    await appendToUnifiedUserLog(db, logEntry.userId, logEntry, now);
  } catch (err) {
    console.warn("[D1Logs] Erro ao sincronizar JSON único do usuário:", err);
  }

  return true;
}

/**
 * Appends a log event to the user's unified JSON structure with 2MB chunk rollover protection.
 */
async function appendToUnifiedUserLog(db, userId, logEntry, now) {
  if (!db || !userId) return;

  // Busca o chunk ativo mais recente
  const latestRow = await db.prepare(`
    SELECT chunk_index, unified_json, byte_size 
    FROM user_logs_unified_store 
    WHERE user_id = ? 
    ORDER BY chunk_index DESC 
    LIMIT 1
  `).bind(userId).first();

  let chunkIndex = latestRow ? Number(latestRow.chunk_index) : 0;
  let unified = null;

  if (latestRow && latestRow.unified_json) {
    try {
      unified = JSON.parse(latestRow.unified_json);
    } catch {
      unified = null;
    }
  }

  if (!unified) {
    unified = {
      userId,
      email: logEntry.details?.email || logEntry.details?.userEmail || "",
      displayName: logEntry.details?.displayName || "",
      metadata: {
        firstAccess: now,
        lastSeen: now,
        accessCount: 1,
        lastIp: logEntry.ip || "",
        country: logEntry.details?.country || "",
        city: logEntry.details?.city || "",
        browser: logEntry.details?.browser || "",
        operatingSystem: logEntry.details?.operatingSystem || ""
      },
      vault: {
        unlocks: [],
        failedAttempts: [],
        securityChanges: []
      },
      shares: [],
      files: [],
      securityEvents: [],
      systemLogs: []
    };
  }

  // Atualiza metadados gerais
  if (logEntry.details?.email) unified.email = logEntry.details.email;
  if (logEntry.details?.displayName) unified.displayName = logEntry.details.displayName;
  unified.metadata.lastSeen = now;
  if (logEntry.ip) unified.metadata.lastIp = logEntry.ip;
  if (logEntry.details?.country) unified.metadata.country = logEntry.details.country;
  if (logEntry.details?.city) unified.metadata.city = logEntry.details.city;
  if (logEntry.details?.browser) unified.metadata.browser = logEntry.details.browser;
  if (logEntry.details?.operatingSystem) unified.metadata.operatingSystem = logEntry.details.operatingSystem;

  const eventPayload = {
    id: logEntry.id,
    timestamp: now,
    type: logEntry.eventType,
    action: logEntry.details?.action || logEntry.details?.type || logEntry.eventType,
    details: logEntry.details?.details || logEntry.details?.reason || "",
    ip: logEntry.ip,
    sessionId: logEntry.details?.sessionId || "",
    requestId: logEntry.details?.requestId || "",
    userAgent: logEntry.userAgent || "",
    ...(logEntry.details?.fileName !== undefined ? { fileName: logEntry.details.fileName } : {}),
    ...(logEntry.details?.fileSize !== undefined ? { fileSize: logEntry.details.fileSize } : {}),
    ...(logEntry.details?.mediaType !== undefined ? { mediaType: logEntry.details.mediaType } : {}),
    ...(logEntry.details?.itemCount !== undefined ? { itemCount: logEntry.details.itemCount } : {}),
    ...(logEntry.details?.resourceId !== undefined ? { resourceId: logEntry.details.resourceId } : {}),
    ...(logEntry.details?.result !== undefined ? { result: logEntry.details.result } : {}),
    ...(logEntry.details?.status !== undefined ? { status: logEntry.details.status } : {})
  };

  // Organiza no slot correto do JSON único
  const type = (logEntry.eventType || "").toLowerCase();
  const action = (logEntry.details?.type || logEntry.details?.action || "").toLowerCase();

  if (type === "user_access") {
    unified.metadata.accessCount = (unified.metadata.accessCount || 0) + 1;
  } else if (action === "vault_unlock") {
    unified.vault.unlocks.unshift({ ...eventPayload, method: logEntry.details?.method || "pin" });
  } else if (action === "vault_failed_attempt" || action === "vault_lockout") {
    unified.vault.failedAttempts.unshift({
      ...eventPayload,
      attemptNumber: logEntry.details?.attemptNumber || 1,
      maxAttempts: logEntry.details?.maxAttempts || 5,
      locked: !!logEntry.details?.locked
    });
  } else if (action.startsWith("vault_") || action.includes("password") || action.includes("pin") || action.includes("encryption")) {
    unified.vault.securityChanges.unshift(eventPayload);
  } else if (action.startsWith("share_") || type === "share") {
    unified.shares.unshift(eventPayload);
  } else if (action.startsWith("file_") || action.includes("upload") || action.includes("delete") || action.includes("trash")) {
    unified.files.unshift(eventPayload);
  } else if (type === "security" || type === "security_events") {
    unified.securityEvents.unshift(eventPayload);
  } else {
    unified.systemLogs.unshift(eventPayload);
  }

  // Verifica o tamanho do JSON em bytes
  let jsonString = JSON.stringify(unified);
  let byteSize = new TextEncoder().encode(jsonString).length;

  // Se estiver acima do limite de 1.8 MB (~2 MB), inicia um novo chunk
  if (byteSize >= CHUNK_SIZE_LIMIT_BYTES) {
    chunkIndex += 1;
    // Cria novo documento limpo para o novo chunk preservando metadados básicos
    unified = {
      userId,
      email: unified.email,
      displayName: unified.displayName,
      metadata: { ...unified.metadata },
      vault: { unlocks: [], failedAttempts: [], securityChanges: [] },
      shares: [],
      files: [],
      securityEvents: [],
      systemLogs: []
    };
    jsonString = JSON.stringify(unified);
    byteSize = new TextEncoder().encode(jsonString).length;
  }

  await db.prepare(`
    INSERT INTO user_logs_unified_store (user_id, chunk_index, unified_json, byte_size, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, chunk_index) DO UPDATE SET
      unified_json = excluded.unified_json,
      byte_size = excluded.byte_size,
      updated_at = excluded.updated_at
  `).bind(userId, chunkIndex, jsonString, byteSize, now).run();
}

/**
 * Lists security/audit logs with support for user filtering, event filtering, and pagination.
 */
export async function listSecurityLogsD1(db, collectionOrType = "", limit = 50, filterUserId = "") {
  if (!db) return [];
  await ensureD1LogsSchema(db);

  const typeMap = {
    user_accesses: "user_access",
    audit_logs: "audit",
    security_events: "security",
    vault_logs: "audit"
  };
  const eventType = typeMap[collectionOrType] || collectionOrType;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

  let query = "SELECT * FROM security_logs_store";
  let conditions = [];
  let params = [];

  if (eventType === "user_access" || eventType === "audit" || eventType === "security") {
    conditions.push("event_type = ?");
    params.push(eventType);
  }

  if (filterUserId && filterUserId.trim()) {
    conditions.push("user_id = ?");
    params.push(filterUserId.trim());
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY timestamp DESC LIMIT ?";
  params.push(safeLimit);

  const rows = await db.prepare(query).bind(...params).all();

  return (rows?.results || []).map(r => {
    let parsed = {};
    try {
      if (r.details_json) parsed = JSON.parse(r.details_json) || {};
    } catch {}
    const safeDetails = typeof parsed.details === "string"
      ? parsed.details
      : (typeof parsed.details?.details === "string" ? parsed.details.details : "");
    const safeReason = typeof parsed.reason === "string" ? parsed.reason : safeDetails;
    return {
      ...parsed,
      id: r.id,
      userId: parsed.userId || r.user_id,
      ip: parsed.ip || r.ip,
      userAgent: parsed.userAgent || r.user_agent,
      timestamp: parsed.timestamp || r.timestamp,
      details: safeDetails,
      reason: safeReason
    };
  });
}

/**
 * Deletes all security and audit logs from D1.
 */
export async function clearAllSecurityLogsD1(db) {
  if (!db) return false;
  await ensureD1LogsSchema(db);
  await db.prepare("DELETE FROM security_logs_store").run();
  await db.prepare("DELETE FROM user_logs_unified_store").run();
  return true;
}
