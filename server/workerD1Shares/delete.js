import { ensureD1SharesSchema } from "./schema.js";

/**
 * Deletes a share in D1 and returns its deterministicKey and imageId if found.
 */
export async function deleteShareD1(db, shareId, ownerId) {
  if (!db || !shareId) return { success: false, deterministicKey: null, imageId: null };
  await ensureD1SharesSchema(db);
  const now = Date.now();
  let deterministicKey = null;
  let imageId = null;

  try {
    const row = await db.prepare("SELECT deterministic_key, image_id FROM user_shares_store WHERE id = ?").bind(shareId).first();
    if (row) {
      deterministicKey = row.deterministic_key || null;
      imageId = row.image_id || null;
    }
  } catch (e) {}

  const updateRes = await db.prepare(
    "UPDATE user_shares_store SET status = 'deleted', updated_at = ? WHERE id = ? AND (owner_id = ? OR ? = 'admin')"
  ).bind(now, shareId, ownerId, ownerId).run();

  const changes = updateRes?.meta?.changes ?? updateRes?.changes ?? 0;
  if (changes !== 1) {
    return { success: false, deterministicKey: null, imageId: null };
  }

  if (!deterministicKey && imageId && ownerId) {
    deterministicKey = `${ownerId}_${imageId}`;
  }

  return { success: true, deterministicKey, imageId };
}
