import { readChunks, replaceDatasetUnlocked } from "./d1Chunks.js";
import { withDatasetLock } from "./d1Locks.js";

export async function migrateChatData(oldDataset, newDataset, env) {
  return withDatasetLock(newDataset, env, async () => {
    const oldChunks = await readChunks(oldDataset, env);
    const items = oldChunks.flatMap(c => c.items).filter(Boolean);
    if (items.length === 0) return { migrated: 0 };
    await replaceDatasetUnlocked(newDataset, items, env);
    return { migrated: items.length };
  });
}

export async function getChatDatasetCounts(dataset, env) {
  const chunks = await readChunks(dataset, env);
  const items = chunks.flatMap(c => c.items).filter(Boolean);
  return { count: items.length, chunks: chunks.length };
}
