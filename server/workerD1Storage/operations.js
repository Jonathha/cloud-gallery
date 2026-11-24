import { ensureD1UserSchema, SAFE_CHUNK_SIZE } from "./schema.js";
import { bumpUserVersion } from "../userSync.js";

/**
 * Retrieves all media metadata items for a specific user across all their chunks.
 */
export async function getUserMetadataList(db, userId) {
  if (!db || !userId) return [];
  try {
    await ensureD1UserSchema(db);
    const stmt = db.prepare(
      "SELECT data_json FROM user_metadata_store WHERE user_id = ? ORDER BY chunk_index ASC"
    );
    const rows = await stmt.bind(userId).all();
    if (!rows || !rows.results || rows.results.length === 0) {
      return [];
    }

    const allItems = [];
    for (const row of rows.results) {
      if (row.data_json) {
        try {
          const items = JSON.parse(row.data_json);
          if (Array.isArray(items)) {
            allItems.push(...items);
          }
        } catch (parseErr) {
          console.error("[D1] Error parsing user chunk JSON:", parseErr);
        }
      }
    }
    return allItems;
  } catch (err) {
    console.error("[D1] Error fetching user metadata list:", err);
    return [];
  }
}

// Memória curta por instância: várias miniaturas seguidas custam uma leitura do D1, não uma cada
const MEDIA_MEMO_TTL_MS = 30000;
const mediaListMemo = new Map();

async function onUserMetadataWritten(userId) {
  mediaListMemo.delete(userId);
  await bumpUserVersion(userId);
}

/**
 * Finds a specific media item for a user across all chunks.
 */
export async function findUserMediaItem(db, userId, mediaId) {
  if (!db || !userId || !mediaId) return null;
  const match = (item) => item.id === mediaId || item.mediaId === mediaId;
  const memo = mediaListMemo.get(userId);
  if (memo && Date.now() - memo.at < MEDIA_MEMO_TTL_MS) {
    const hit = memo.items.find(match);
    if (hit) return hit;
  }
  // Sem memória, expirada ou item ausente (pode estar velho): lê o D1 uma vez e renova
  const items = await getUserMetadataList(db, userId);
  if (mediaListMemo.size >= 50) mediaListMemo.delete(mediaListMemo.keys().next().value);
  mediaListMemo.set(userId, { items, at: Date.now() });
  return items.find(match) || null;
}

/**
 * Appends or updates a media metadata item in the user's chunk storage.
 * If the item already exists, updates it in-place preserving historical fields.
 * If adding a new item would exceed the safe limit, automatically seals the chunk
 * and creates the next chunk for the SAME user.
 */
export async function saveUserMediaItem(db, userId, mediaItem, maxRetries = 5) {
  try {
    return await saveUserMediaItemUncached(db, userId, mediaItem, maxRetries);
  } finally {
    await onUserMetadataWritten(userId);
  }
}

async function saveUserMediaItemUncached(db, userId, mediaItem, maxRetries = 5) {
  if (!db || !userId || !mediaItem || !mediaItem.id) return false;
  try {
    await ensureD1UserSchema(db);
    const now = Date.now();

    // 1. Check if the item already exists in any chunk of this user
    const selectAllStmt = db.prepare(
      "SELECT id, chunk_index, data_json, is_closed, updated_at FROM user_metadata_store WHERE user_id = ? ORDER BY chunk_index ASC"
    );
    const allChunksRes = await selectAllStmt.bind(userId).all();
    const allChunks = allChunksRes?.results || [];

    for (const chunk of allChunks) {
      try {
        const items = JSON.parse(chunk.data_json || "[]");
        const existingIdx = items.findIndex((i) => i.id === mediaItem.id);
        if (existingIdx !== -1) {
          // Update in-place, preserving historical metadata
          const existing = items[existingIdx];

          const allowedPhysicalFields = {
            iv: mediaItem.iv,
            thumbnailIv: mediaItem.thumbnailIv,
            fileKeyCiphertext: mediaItem.fileKeyCiphertext,
            fileKeyIv: mediaItem.fileKeyIv,
            fileSalt: mediaItem.fileSalt,
            totalSize: mediaItem.totalSize,
            fileSize: mediaItem.fileSize,
            contentType: mediaItem.contentType,
            width: mediaItem.width,
            height: mediaItem.height,
            duration: mediaItem.duration,
            r2Etag: mediaItem.r2Etag
          };

          for (const key of Object.keys(allowedPhysicalFields)) {
            if (allowedPhysicalFields[key] === undefined) {
              delete allowedPhysicalFields[key];
            }
          }

          items[existingIdx] = {
            ...existing,
            ...allowedPhysicalFields,
            takenAt: existing.takenAt || mediaItem.takenAt || null,
            uploadedAt: existing.uploadedAt || mediaItem.uploadedAt || null,
            createdAt: existing.createdAt || mediaItem.createdAt || now,
            userId: userId
          };
          const updatedJson = JSON.stringify(items);
          const byteSize = new TextEncoder().encode(updatedJson).byteLength;
          const chunkUpdatedAt = chunk.updated_at || 0;

          // Optimistic Concurrency Control (CAS) condition on updated_at
          const updateStmt = db.prepare(
            "UPDATE user_metadata_store SET data_json = ?, byte_size = ?, item_count = ?, updated_at = ? WHERE id = ? AND updated_at = ?"
          );
          const updateRes = await updateStmt.bind(updatedJson, byteSize, items.length, now, chunk.id, chunkUpdatedAt).run();
          const changes = updateRes?.meta?.changes ?? updateRes?.changes ?? 1;
          if (changes === 0) {
            if (maxRetries > 0) {
              return saveUserMediaItem(db, userId, mediaItem, maxRetries - 1);
            }
            console.warn("[D1] Concurrency conflict (CAS mismatch) during chunk update for item", mediaItem.id);
            return false;
          }
          return true;
        }
      } catch (e) {
        console.warn("[D1] Error checking existing chunk:", e);
      }
    }

    // 2. Item is new: Get the currently active (open) chunk for this user
    const activeStmt = db.prepare(
      "SELECT * FROM user_metadata_store WHERE user_id = ? AND is_closed = 0 ORDER BY chunk_index DESC LIMIT 1"
    );
    const activeRes = await activeStmt.bind(userId).first();

    const cleanItem = {
      ...mediaItem,
      userId: userId,
      takenAt: mediaItem.takenAt || null,
      uploadedAt: mediaItem.uploadedAt || new Date(mediaItem.createdAt || now).toISOString(),
      createdAt: Number(mediaItem.createdAt) || now
    };

    if (!activeRes) {
      // Determine next chunk index
      const maxIndexRes = await db.prepare(
        "SELECT MAX(chunk_index) as max_idx FROM user_metadata_store WHERE user_id = ?"
      ).bind(userId).first();
      const nextIndex = (maxIndexRes?.max_idx || 0) + 1;

      const initialItems = [cleanItem];
      const jsonStr = JSON.stringify(initialItems);
      const byteSize = new TextEncoder().encode(jsonStr).byteLength;
      const chunkId = `${userId}_chunk_${String(nextIndex).padStart(3, '0')}`;

      const insertStmt = db.prepare(`
        INSERT INTO user_metadata_store (id, user_id, chunk_index, data_json, byte_size, item_count, is_closed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
      `);
      try {
        await insertStmt.bind(chunkId, userId, nextIndex, jsonStr, byteSize, 1, now, now).run();
        return true;
      } catch (insertErr) {
        // Another concurrent writer may have created this exact chunk first.
        // Reload fresh state and retry instead of returning a false failure.
        if (maxRetries > 0) {
          return saveUserMediaItem(db, userId, mediaItem, maxRetries - 1);
        }
        console.error("[D1] Failed to create initial metadata chunk:", insertErr);
        return false;
      }
    }

    // An active chunk exists: check if adding new item exceeds SAFE_CHUNK_SIZE
    const existingItems = JSON.parse(activeRes.data_json || "[]");
    const candidateItems = [...existingItems, cleanItem];
    const candidateJson = JSON.stringify(candidateItems);
    const candidateBytes = new TextEncoder().encode(candidateJson).byteLength;

    if (candidateBytes > SAFE_CHUNK_SIZE) {
      // Seal current chunk
      await db.prepare(
        "UPDATE user_metadata_store SET is_closed = 1, updated_at = ? WHERE id = ?"
      ).bind(now, activeRes.id).run();

      // Create next chunk for the SAME user
      const nextIndex = activeRes.chunk_index + 1;
      const initialItems = [cleanItem];
      const jsonStr = JSON.stringify(initialItems);
      const byteSize = new TextEncoder().encode(jsonStr).byteLength;
      const chunkId = `${userId}_chunk_${String(nextIndex).padStart(3, '0')}`;

      const insertStmt = db.prepare(`
        INSERT INTO user_metadata_store (id, user_id, chunk_index, data_json, byte_size, item_count, is_closed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
      `);
      try {
        await insertStmt.bind(chunkId, userId, nextIndex, jsonStr, byteSize, 1, now, now).run();
        return true;
      } catch (insertErr) {
        // Another writer may have sealed the same chunk and created the next
        // chunk first. Retry against the fresh active chunk.
        if (maxRetries > 0) {
          return saveUserMediaItem(db, userId, mediaItem, maxRetries - 1);
        }
        console.error("[D1] Failed to create next metadata chunk:", insertErr);
        return false;
      }
    } else {
      // Append to current chunk
      const updateStmt = db.prepare(
        "UPDATE user_metadata_store SET data_json = ?, byte_size = ?, item_count = ?, updated_at = ? WHERE id = ? AND updated_at = ?"
      );
      const updateRes = await updateStmt.bind(
        candidateJson,
        candidateBytes,
        candidateItems.length,
        now,
        activeRes.id,
        activeRes.updated_at || 0
      ).run();
      const changes = updateRes?.meta?.changes ?? updateRes?.changes ?? 0;
      if (changes === 1) return true;
      if (maxRetries > 0) {
        return saveUserMediaItem(db, userId, mediaItem, maxRetries - 1);
      }
      console.warn("[D1] Concurrency conflict (CAS mismatch) during append for item", mediaItem.id);
      return false;
    }
  } catch (err) {
    console.error("[D1] Error saving user media item:", err);
    return false;
  }
}

/**
 * Deletes a media metadata item from the user's chunk storage with CAS retry.
 */
export async function deleteUserMediaItem(db, userId, mediaId, maxRetries = 5) {
  return deleteUserMediaItems(db, userId, [mediaId], maxRetries);
}

/**
 * Deletes one or multiple media metadata items from the user's chunk storage atomically with CAS retry.
 */
export async function deleteUserMediaItems(db, userId, mediaIds, maxRetries = 5) {
  try {
    return await deleteUserMediaItemsUncached(db, userId, mediaIds, maxRetries);
  } finally {
    await onUserMetadataWritten(userId);
  }
}

async function deleteUserMediaItemsUncached(db, userId, mediaIds, maxRetries = 5) {
  if (!db || !userId || !Array.isArray(mediaIds) || mediaIds.length === 0) return false;
  try {
    await ensureD1UserSchema(db);
    const idSet = new Set(mediaIds);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const selectAllStmt = db.prepare(
        "SELECT id, data_json, updated_at FROM user_metadata_store WHERE user_id = ? ORDER BY chunk_index ASC"
      );
      const allChunksRes = await selectAllStmt.bind(userId).all();
      const allChunks = allChunksRes?.results || [];
      let conflict = false;
      let deletedCount = 0;

      for (const chunk of allChunks) {
        try {
          const items = JSON.parse(chunk.data_json || "[]");
          const filtered = items.filter((i) => !idSet.has(i.id) && !idSet.has(i.mediaId));
          if (filtered.length !== items.length) {
            const now = Date.now();
            const updatedJson = JSON.stringify(filtered);
            const byteSize = new TextEncoder().encode(updatedJson).byteLength;
            const chunkUpdatedAt = chunk.updated_at || 0;

            const updateStmt = db.prepare(
              "UPDATE user_metadata_store SET data_json = ?, byte_size = ?, item_count = ?, updated_at = ? WHERE id = ? AND updated_at = ?"
            );
            const updateRes = await updateStmt.bind(updatedJson, byteSize, filtered.length, now, chunk.id, chunkUpdatedAt).run();
            const changes = updateRes?.meta?.changes ?? updateRes?.changes ?? 0;
            if (changes === 0) {
              conflict = true;
              break;
            }
            deletedCount += (items.length - filtered.length);
          }
        } catch (e) {
          console.warn("[D1] Error filtering chunk during delete:", e);
        }
      }

      if (conflict) {
        // Concurrency conflict detected: another request modified the chunk in parallel.
        // Wait a short backoff with jitter and retry with fresh chunk data.
        await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 50));
        continue;
      }

      return true;
    }
    console.warn(`[D1] deleteUserMediaItems exceeded ${maxRetries} CAS attempts due to high concurrency`);
    return false;
  } catch (err) {
    console.error("[D1] Error deleting user media items:", err);
    return false;
  }
}
