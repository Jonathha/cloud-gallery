export function sqlHandler11(normalized, params, tables) {
  // Audio Uploads: UPDATE ... WHERE id = ? AND status = 'reserved'
  if (normalized.startsWith("UPDATE chat_global_audio_uploads SET status = 'released' WHERE id = ? AND status = 'reserved'")) {
    const [id] = params;
    const row = tables.chat_global_audio_uploads.get(id);
    if (row && row.status === "reserved") row.status = "released";
    return { results: [], meta: { changes: 1 } };
  }
}

export function sqlHandler12(normalized, params, tables) {
  // Audio Uploads: completeAudioUploadSlot
  if (normalized.startsWith("UPDATE chat_global_audio_uploads SET key = ?, status = 'uploaded', expires_at = ? WHERE id = ?")) {
    const [key, expiresAt, id] = params;
    const row = tables.chat_global_audio_uploads.get(id);
    if (row) {
      row.key = key;
      row.status = "uploaded";
      row.expires_at = expiresAt;
      return { results: [], meta: { changes: 1 } };
    }
    return { results: [], meta: { changes: 0 } };
  }
}

export function sqlHandler13(normalized, params, tables) {
  // Audio Uploads: linkAudioUploadKey
  if (normalized.startsWith("UPDATE chat_global_audio_uploads SET status = 'linked', linked_message_id = ? WHERE key = ?")) {
    const [msgId, key] = params;
    for (const row of tables.chat_global_audio_uploads.values()) {
      if (row.key === key) {
        row.status = "linked";
        row.linked_message_id = msgId;
      }
    }
    return { results: [], meta: { changes: 1 } };
  }
}

export function sqlHandler14(normalized, params, tables) {
  // Audio Uploads: markAudioUploadCleaned
  if (normalized.startsWith("UPDATE chat_global_audio_uploads SET status = 'cleaned' WHERE key = ?")) {
    const [key] = params;
    for (const row of tables.chat_global_audio_uploads.values()) {
      if (row.key === key) {
        row.status = "cleaned";
      }
    }
    return { results: [], meta: { changes: 1 } };
  }
}
