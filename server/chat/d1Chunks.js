import { d1Query, d1Batch } from "./d1Config.js";
import { ensureChatGlobalSchema } from "./d1Schema.js";

const MAX_CHUNK_BYTES = 1_800_000;

export async function readChunks(dataset, env) {
  await ensureChatGlobalSchema(env);
  const result = await d1Query(
    "SELECT dataset, chunk_index, data, size_bytes, version, updated_at FROM chat_global_json_chunks WHERE dataset = ? ORDER BY chunk_index ASC",
    [dataset],
    env
  );
  return (result.results || []).map(row => ({
    ...row,
    items: JSON.parse(row.data || "[]")
  }));
}

export async function replaceDatasetUnlocked(dataset, items, env) {
  // Tamanho medido de forma incremental: "[" + itens separados por "," + "]"
  // (idêntico ao JSON.stringify do array, sem reserializar o array a cada item).
  const encoder = new TextEncoder();
  const chunks = [];
  let current = { jsons: [], bytes: 2 };

  for (const item of items) {
    const json = JSON.stringify(item) ?? "null";
    const itemBytes = encoder.encode(json).byteLength;
    const candidateBytes = current.bytes + itemBytes + (current.jsons.length > 0 ? 1 : 0);
    if (candidateBytes > MAX_CHUNK_BYTES) {
      if (current.jsons.length === 0) {
        throw new Error(`Registro do dataset ${dataset} excede o limite seguro de ${MAX_CHUNK_BYTES} bytes.`);
      }
      chunks.push(current);
      current = { jsons: [json], bytes: 2 + itemBytes };
    } else {
      current.jsons.push(json);
      current.bytes = candidateBytes;
    }
  }
  if (current.jsons.length > 0) {
    chunks.push(current);
  }

  const now = Date.now();
  if (chunks.length === 0) {
    await d1Query("DELETE FROM chat_global_json_chunks WHERE dataset = ?", [dataset], env);
    return;
  }

  // Upsert dos chunks + limpeza dos que sobraram em uma única chamada (um chunk nunca fica vazio para leitores)
  const statements = chunks.map((chunk, i) => ({
    sql: "INSERT INTO chat_global_json_chunks (dataset, chunk_index, data, size_bytes, version, updated_at) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(dataset, chunk_index) DO UPDATE SET data = excluded.data, size_bytes = excluded.size_bytes, version = excluded.version, updated_at = excluded.updated_at",
    params: [dataset, i, `[${chunk.jsons.join(",")}]`, chunk.bytes, now]
  }));
  statements.push({
    sql: "DELETE FROM chat_global_json_chunks WHERE dataset = ? AND chunk_index >= ?",
    params: [dataset, chunks.length]
  });
  await d1Batch(statements, env);
}
