import { ensureD1VaultSchema } from "./schema.js";

/**
 * Media keys operations in D1.
 */
export async function getMediaKeyD1(db, imageId, userId, idToken) {
  if (!db || !imageId) return { exists: false, allowed: false, key: null };
  await ensureD1VaultSchema(db);

  const row = await db.prepare("SELECT * FROM media_keys_store WHERE image_id = ?").bind(imageId).first();
  if (row) {
    if (userId && row.user_id !== userId) {
      return { exists: true, allowed: false, key: null };
    }
    return {
      exists: true,
      allowed: true,
      key: {
        id: row.image_id,
        keyCiphertext: row.key_ciphertext,
        iv: row.iv,
        salt: row.salt,
        isProtected: !!row.is_protected,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    };
  }

  return { exists: false, allowed: false, key: null };
}

export async function saveMediaKeyD1(db, imageId, userId, keyData) {
  if (!db || !imageId || !keyData.keyCiphertext || !userId) return false;
  await ensureD1VaultSchema(db);
  const now = Date.now();
  const res = await db.prepare(`
    INSERT INTO media_keys_store (image_id, user_id, key_ciphertext, iv, salt, is_protected, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(image_id) DO UPDATE SET
      key_ciphertext = excluded.key_ciphertext,
      iv = excluded.iv,
      salt = excluded.salt,
      is_protected = excluded.is_protected,
      updated_at = excluded.updated_at
    WHERE media_keys_store.user_id = excluded.user_id
  `).bind(
    imageId,
    userId,
    keyData.keyCiphertext,
    keyData.iv || "",
    keyData.salt || "",
    keyData.isProtected ? 1 : 0,
    now,
    now
  ).run();

  const changes = res?.meta?.changes ?? res?.changes ?? 0;
  if (res?.success === false || changes === 0) {
    return false;
  }
  return true;
}

export async function deleteMediaKeyD1(db, imageId, userId) {
  if (!db || !imageId || !userId) return { success: false, notFound: false, forbidden: true };
  await ensureD1VaultSchema(db);

  const existing = await db.prepare("SELECT user_id FROM media_keys_store WHERE image_id = ?").bind(imageId).first();
  if (!existing) {
    return { success: true, notFound: true, forbidden: false };
  }
  if (existing.user_id !== userId) {
    return { success: false, notFound: false, forbidden: true };
  }

  const res = await db.prepare("DELETE FROM media_keys_store WHERE image_id = ? AND user_id = ?").bind(imageId, userId).run();
  const changes = res?.meta?.changes ?? res?.changes ?? 0;
  return { success: changes > 0, notFound: false, forbidden: false };
}
