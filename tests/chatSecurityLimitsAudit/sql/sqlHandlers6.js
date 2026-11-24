export function sqlHandler18(normalized, params, tables) {
  // Media Cleanup: UPDATE retry
  if (normalized.startsWith("UPDATE chat_global_media_cleanup SET attempts = attempts + 1")) {
    const [now, errStr, id] = params;
    const row = tables.chat_global_media_cleanup.get(id);
    if (row) {
      row.attempts++;
      row.last_attempt_at = now;
      row.last_error = errStr;
    }
    return { results: [], meta: { changes: 1 } };
  }
}

export function sqlHandler19(normalized, params, tables) {
  // Abandoned uploads query
  if (normalized.includes("FROM chat_global_audio_uploads WHERE status = 'uploaded' AND created_at <= ? AND key IS NOT NULL")) {
    const [cutoff] = params;
    const results = [];
    for (const row of tables.chat_global_audio_uploads.values()) {
      if (row.status === "uploaded" && row.created_at <= cutoff && row.key) {
        results.push({ ...row });
      }
    }
    return { results, meta: { changes: 0 } };
  }
}

export function sqlHandler20(normalized, params, tables) {
  if (normalized.startsWith("UPDATE chat_global_audio_uploads SET status = 'cleaned' WHERE id = ?")) {
    const [id] = params;
    const row = tables.chat_global_audio_uploads.get(id);
    if (row) row.status = "cleaned";
    return { results: [], meta: { changes: 1 } };
  }
}

export function sqlHandler21(normalized, params, tables) {
  if (normalized.startsWith("UPDATE chat_global_audio_uploads SET status = 'linked' WHERE id = ?")) {
    const [id] = params;
    const row = tables.chat_global_audio_uploads.get(id);
    if (row) row.status = "linked";
    return { results: [], meta: { changes: 1 } };
  }
}
