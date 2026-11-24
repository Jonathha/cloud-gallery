export function sqlHandler08(normalized, params, tables) {
  // Audio Uploads: UPDATE chat_global_audio_uploads SET status = 'released' WHERE user_id = ? AND status = 'reserved' AND expires_at <= ?
  if (normalized.includes("UPDATE chat_global_audio_uploads SET status = 'released' WHERE user_id = ? AND status = 'reserved' AND expires_at <= ?")) {
    const [userId, now] = params;
    for (const row of tables.chat_global_audio_uploads.values()) {
      if (row.user_id === userId && row.status === "reserved" && row.expires_at <= now) {
        row.status = "released";
      }
    }
    return { results: [], meta: { changes: 1 } };
  }
}

export function sqlHandler09(normalized, params, tables) {
  // Audio Uploads: SELECT ... FROM chat_global_audio_uploads WHERE user_id = ? AND created_at >= ? AND status IN ('reserved', 'uploaded')
  if (normalized.includes("FROM chat_global_audio_uploads WHERE user_id = ? AND created_at >= ? AND status IN ('reserved', 'uploaded')")) {
    const [userId, minTime] = params;
    const results = [];
    for (const row of tables.chat_global_audio_uploads.values()) {
      if (row.user_id === userId && row.created_at >= minTime && (row.status === "reserved" || row.status === "uploaded")) {
        results.push({ id: row.id, created_at: row.created_at, status: row.status });
      }
    }
    return { results, meta: { changes: 0 } };
  }
}

export function sqlHandler10(normalized, params, tables) {
  // Audio Uploads: INSERT INTO chat_global_audio_uploads
  if (normalized.startsWith("INSERT INTO chat_global_audio_uploads")) {
    const [id, userId, now, expiresAt] = params;
    tables.chat_global_audio_uploads.set(id, {
      id,
      user_id: userId,
      key: null,
      status: "reserved",
      created_at: now,
      expires_at: expiresAt
    });
    return { results: [], meta: { changes: 1 } };
  }
}
