import { d1Query } from "./d1Config.js";
import { ensureChatGlobalSchema } from "./d1Schema.js";

const LOCK_TTL_MS = 60_000;
// Cada tentativa gasta 2 subrequisições (limite de 50 por invocação no plano gratuito do Worker)
const LOCK_WAIT_MS = 250;
const LOCK_ATTEMPTS = 12;

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export async function withDatasetLock(dataset, env, operation) {
  await ensureChatGlobalSchema(env);
  const lockId = crypto.randomUUID();

  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt++) {
    const now = Date.now();
    await d1Query(
      "DELETE FROM chat_global_locks WHERE dataset = ? AND expires_at <= ?",
      [dataset, now],
      env
    );

    const acquired = await d1Query(
      "INSERT OR IGNORE INTO chat_global_locks (dataset, lock_id, expires_at) VALUES (?, ?, ?)",
      [dataset, lockId, now + LOCK_TTL_MS],
      env
    );

    if ((acquired.meta?.changes || 0) > 0) {
      try {
        return await operation();
      } finally {
        await d1Query(
          "DELETE FROM chat_global_locks WHERE dataset = ? AND lock_id = ?",
          [dataset, lockId],
          env
        );
      }
    }

    await sleep(LOCK_WAIT_MS);
  }

  throw new Error(`D1 dataset ocupado: ${dataset}`);
}
