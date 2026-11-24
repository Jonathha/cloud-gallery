export function sqlHandler05(normalized, params, tables) {
  // Chunks: SELECT ... FROM chat_global_json_chunks WHERE dataset = ?
  if (normalized.startsWith("SELECT dataset, chunk_index, data, size_bytes, version, updated_at FROM chat_global_json_chunks WHERE dataset = ?")) {
    const [dataset] = params;
    const rows = [];
    for (const [key, val] of tables.chat_global_json_chunks.entries()) {
      if (val.dataset === dataset) rows.push(val);
    }
    rows.sort((a, b) => a.chunk_index - b.chunk_index);
    return { results: rows, meta: { changes: 0 } };
  }
}

export function sqlHandler06(normalized, params, tables) {
  // Chunks: DELETE FROM chat_global_json_chunks WHERE dataset = ?
  if (normalized.startsWith("DELETE FROM chat_global_json_chunks WHERE dataset = ?")) {
    const [dataset] = params;
    for (const [key, val] of Array.from(tables.chat_global_json_chunks.entries())) {
      if (val.dataset === dataset) tables.chat_global_json_chunks.delete(key);
    }
    return { results: [], meta: { changes: 1 } };
  }
}

export function sqlHandler07(normalized, params, tables) {
  // Chunks: INSERT INTO chat_global_json_chunks
  if (normalized.startsWith("INSERT INTO chat_global_json_chunks")) {
    const [dataset, chunkIndex, data, sizeBytes, updatedAt] = params;
    tables.chat_global_json_chunks.set(`${dataset}_${chunkIndex}`, {
      dataset,
      chunk_index: chunkIndex,
      data,
      size_bytes: sizeBytes,
      version: 1,
      updated_at: updatedAt
    });
    return { results: [], meta: { changes: 1 } };
  }
}
