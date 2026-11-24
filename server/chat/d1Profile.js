import { readChunks, replaceDatasetUnlocked } from "./d1Chunks.js";
import { withDatasetLock } from "./d1Locks.js";

const PROFILES_DATASET = "chat_profiles_v1";

export async function getChatProfile(userId, env) {
  const chunks = await readChunks(PROFILES_DATASET, env);
  const profiles = chunks.flatMap(c => c.items);
  return profiles.find(p => p && p.userId === userId) || null;
}

export async function saveChatProfile(userId, username, email, env) {
  return withDatasetLock(PROFILES_DATASET, env, async () => {
    const chunks = await readChunks(PROFILES_DATASET, env);
    const profiles = chunks.flatMap(c => c.items);
    const now = Date.now();
    const existingIndex = profiles.findIndex(p => p && p.userId === userId);
    const profile = {
      userId,
      username,
      email: email || null,
      updatedAt: now,
      createdAt: existingIndex >= 0 ? (profiles[existingIndex].createdAt || now) : now
    };
    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.push(profile);
    }
    await replaceDatasetUnlocked(PROFILES_DATASET, profiles, env);
    return profile;
  });
}
