export function sqlHandler01(normalized, params, tables) {
  if (normalized.startsWith("CREATE TABLE")) {
    return { results: [], meta: { changes: 0 } };
  }
}

export function sqlHandler02(normalized, params, tables) {
  // Locks: DELETE FROM chat_global_locks WHERE dataset = ? AND expires_at <= ?
  if (normalized.startsWith("DELETE FROM chat_global_locks WHERE dataset = ? AND expires_at <= ?")) {
    const [dataset, now] = params;
    const lock = tables.chat_global_locks.get(dataset);
    if (lock && lock.expires_at <= now) {
      tables.chat_global_locks.delete(dataset);
    }
    return { results: [], meta: { changes: 1 } };
  }
}

export function sqlHandler03(normalized, params, tables) {
  // Locks: DELETE FROM chat_global_locks WHERE dataset = ? AND lock_id = ?
  if (normalized.startsWith("DELETE FROM chat_global_locks WHERE dataset = ? AND lock_id = ?")) {
    const [dataset, lockId] = params;
    const lock = tables.chat_global_locks.get(dataset);
    if (lock && lock.lock_id === lockId) {
      tables.chat_global_locks.delete(dataset);
    }
    return { results: [], meta: { changes: 1 } };
  }
}

export function sqlHandler04(normalized, params, tables) {
  // Locks: INSERT OR IGNORE INTO chat_global_locks
  if (normalized.startsWith("INSERT OR IGNORE INTO chat_global_locks")) {
    const [dataset, lockId, expiresAt] = params;
    if (tables.chat_global_locks.has(dataset)) {
      return { results: [], meta: { changes: 0 } };
    }
    tables.chat_global_locks.set(dataset, { lock_id: lockId, expires_at: expiresAt });
    return { results: [], meta: { changes: 1 } };
  }
}
