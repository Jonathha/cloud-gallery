export function sqlHandler15(normalized, params, tables) {
  // Media Cleanup: INSERT INTO chat_global_media_cleanup
  if (normalized.startsWith("INSERT INTO chat_global_media_cleanup")) {
    const [id, mediaKey, reason, lastError, createdAt, lastAttemptAt] = params;
    tables.chat_global_media_cleanup.set(id, {
      id,
      media_key: mediaKey,
      reason,
      attempts: 1,
      status: "pending",
      last_error: lastError,
      created_at: createdAt,
      last_attempt_at: lastAttemptAt
    });
    return { results: [], meta: { changes: 1 } };
  }
}

export function sqlHandler16(normalized, params, tables) {
  // Media Cleanup: SELECT ... FROM chat_global_media_cleanup WHERE status = 'pending'
  if (normalized.includes("FROM chat_global_media_cleanup WHERE status = 'pending'")) {
    const results = [];
    for (const row of tables.chat_global_media_cleanup.values()) {
      if (row.status === "pending" && row.attempts < 10) results.push({ ...row });
    }
    return { results, meta: { changes: 0 } };
  }
}

export function sqlHandler17(normalized, params, tables) {
  // Media Cleanup: UPDATE completed
  if (normalized.startsWith("UPDATE chat_global_media_cleanup SET status = 'completed'")) {
    const [now, id] = params;
    const row = tables.chat_global_media_cleanup.get(id);
    if (row) {
      row.status = "completed";
      row.last_attempt_at = now;
    }
    return { results: [], meta: { changes: 1 } };
  }
}
