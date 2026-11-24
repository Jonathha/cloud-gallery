import { d1Query, d1Batch } from "./d1Config.js";
import { ensureChatGlobalSchema } from "./d1Schema.js";
import { readChunks } from "./d1Chunks.js";
import { withDatasetLock } from "./d1Locks.js";

export const RATE_LIMIT_WINDOW_MS = 3 * 60 * 1000;
export const MAX_MESSAGES_PER_WINDOW = 20;
export const MAX_AUDIOS_PER_WINDOW = 5;

export async function reserveAudioUploadSlot(userId, env) {
  return withDatasetLock(`audio_reserve_${userId}`, env, async () => {
    await ensureChatGlobalSchema(env);
    const now = Date.now();

    await d1Query(
      "UPDATE chat_global_audio_uploads SET status = 'released' WHERE user_id = ? AND status = 'reserved' AND expires_at <= ?",
      [userId, now],
      env
    );

    let active;
    try {
      active = await d1Query(
        "SELECT id, created_at, status FROM chat_global_audio_uploads WHERE user_id = ? AND created_at >= ? AND status IN ('reserved', 'uploaded')",
        [userId, now - RATE_LIMIT_WINDOW_MS],
        env
      );
    } catch (err) {
      const error = new Error("Não foi possível verificar os limites de envio: " + (err?.message || ""));
      error.d1Error = true;
      throw error;
    }

    const results = active.results || [];
    if (results.length >= MAX_AUDIOS_PER_WINDOW) {
      const oldest = results[0]?.created_at || now;
      const retryAfter = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
      const err = new Error("Limite de áudios atingido (máximo de 5 áudios a cada 3 minutos). Aguarde antes de enviar novamente.");
      err.rateLimited = true;
      err.limitType = "audio";
      err.retryAfter = retryAfter;
      throw err;
    }

    const id = crypto.randomUUID();
    const expiresAt = now + 5 * 60 * 1000;
    await d1Query(
      "INSERT INTO chat_global_audio_uploads (id, user_id, status, created_at, expires_at) VALUES (?, ?, 'reserved', ?, ?)",
      [id, userId, now, expiresAt],
      env
    );

    return { id, expiresAt };
  });
}

export async function releaseAudioUploadSlot(id, env) {
  await ensureChatGlobalSchema(env);
  await d1Query(
    "UPDATE chat_global_audio_uploads SET status = 'released' WHERE id = ? AND status = 'reserved'",
    [id],
    env
  );
}

export async function completeAudioUploadSlot(id, key, env) {
  await ensureChatGlobalSchema(env);
  const expiresAt = Date.now() + 60 * 60 * 1000;
  const res = await d1Query(
    "UPDATE chat_global_audio_uploads SET key = ?, status = 'uploaded', expires_at = ? WHERE id = ?",
    [key, expiresAt, id],
    env
  );
  if (!res || (res.meta?.changes || 0) === 0) {
    throw new Error("Reserva de upload não encontrada ou expirada.");
  }
}

export async function recordPendingMediaCleanup(mediaKey, reason, lastError, env) {
  await ensureChatGlobalSchema(env);
  const id = crypto.randomUUID();
  const now = Date.now();
  await d1Query(
    "INSERT INTO chat_global_media_cleanup (id, media_key, reason, attempts, status, last_error, created_at, last_attempt_at) VALUES (?, ?, ?, 1, 'pending', ?, ?, ?)",
    [id, mediaKey, reason, lastError || null, now, now],
    env
  );
}

export async function markAudioUploadCleaned(mediaKey, env) {
  await ensureChatGlobalSchema(env);
  await d1Query(
    "UPDATE chat_global_audio_uploads SET status = 'cleaned' WHERE key = ?",
    [mediaKey],
    env
  );
}

export async function recordPendingMediaCleanups(mediaKeys, reason, lastError, env) {
  if (!mediaKeys.length) return;
  await ensureChatGlobalSchema(env);
  const now = Date.now();
  await d1Batch(mediaKeys.map(mediaKey => ({
    sql: "INSERT INTO chat_global_media_cleanup (id, media_key, reason, attempts, status, last_error, created_at, last_attempt_at) VALUES (?, ?, ?, 1, 'pending', ?, ?, ?)",
    params: [crypto.randomUUID(), mediaKey, reason, lastError || null, now, now]
  })), env);
}

export async function markAudioUploadsCleaned(mediaKeys, env) {
  if (!mediaKeys.length) return;
  await ensureChatGlobalSchema(env);
  const placeholders = mediaKeys.map(() => "?").join(",");
  await d1Query(
    `UPDATE chat_global_audio_uploads SET status = 'cleaned' WHERE key IN (${placeholders})`,
    mediaKeys,
    env
  );
}

export async function processPendingMediaCleanups(env) {
  await ensureChatGlobalSchema(env);
  const bucket = env?.CHAT_R2 || env?.R2;
  const result = await d1Query(
    "SELECT id, media_key, attempts FROM chat_global_media_cleanup WHERE status = 'pending' AND attempts < 10",
    [],
    env
  );
  const rows = result.results || [];
  let succeeded = 0;
  let failed = 0;
  const now = Date.now();

  for (const row of rows) {
    try {
      if (bucket) {
        await bucket.delete(row.media_key);
      }
      await d1Query(
        "UPDATE chat_global_media_cleanup SET status = 'completed', last_attempt_at = ? WHERE id = ?",
        [now, row.id],
        env
      );
      succeeded++;
    } catch (err) {
      failed++;
      await d1Query(
        "UPDATE chat_global_media_cleanup SET attempts = attempts + 1, last_error = ?, last_attempt_at = ? WHERE id = ?",
        [err?.message || "Erro desconhecido", now, row.id],
        env
      );
    }
  }

  return { succeeded, failed };
}

export async function reconcileAbandonedAudioUploads(env, cutoffMs = 15 * 60 * 1000) {
  await ensureChatGlobalSchema(env);
  const bucket = env?.CHAT_R2 || env?.R2;
  const cutoff = Date.now() - cutoffMs;
  const uploads = await d1Query(
    "SELECT id, key FROM chat_global_audio_uploads WHERE status = 'uploaded' AND created_at <= ? AND key IS NOT NULL",
    [cutoff],
    env
  );
  const rows = uploads.results || [];
  if (rows.length === 0) return { cleaned: 0, preserved: 0 };

  const chunks = await readChunks("Mensagem", env);
  const messages = chunks.flatMap(c => c.items).filter(Boolean);
  const activeKeys = new Set();
  for (const m of messages) {
    if (m.audioUrl) {
      try {
        const url = new URL(m.audioUrl, "http://localhost");
        const prefix = "/api/chat/media/";
        if (url.pathname.startsWith(prefix)) {
          activeKeys.add(decodeURIComponent(url.pathname.slice(prefix.length)));
        }
      } catch {}
    }
  }

  let cleaned = 0;
  let preserved = 0;

  for (const row of rows) {
    if (activeKeys.has(row.key)) {
      await d1Query(
        "UPDATE chat_global_audio_uploads SET status = 'linked' WHERE id = ?",
        [row.id],
        env
      );
      preserved++;
    } else {
      if (bucket) {
        try {
          await bucket.delete(row.key);
        } catch {}
      }
      await d1Query(
        "UPDATE chat_global_audio_uploads SET status = 'cleaned' WHERE id = ?",
        [row.id],
        env
      );
      cleaned++;
    }
  }

  return { cleaned, preserved };
}

export async function runAutoChatMediaMaintenance(env, ctx) {
  const tasks = [
    processPendingMediaCleanups(env).catch(() => {}),
    reconcileAbandonedAudioUploads(env).catch(() => {})
  ];
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(Promise.all(tasks));
  } else {
    await Promise.all(tasks);
  }
}
