import { ensureD1SharesSchema } from "./schema.js";
import { expireStaleSharesD1, LIVE_SHARE_SQL } from "./lookup.js";
import { MAX_ACTIVE_SHARES_PER_USER, ONE_TIME_WINDOW_MS } from "./limits.js";

/**
 * Stores a new active link for the owner/media pair. Rules (one atomic INSERT ... SELECT):
 * - at most 1 active link per media;
 * - at most MAX_ACTIVE_SHARES_PER_USER live links per account across all media.
 * Both conditions are checked inside the same statement, so concurrent creates cannot exceed them.
 * Returns { success: true } or { success: false, code } where code is
 * SHARE_LIMIT_REACHED | MEDIA_ALREADY_SHARED | DUPLICATE_ID | DB_ERROR | INVALID.
 */
export async function createShareD1(db, shareData) {
  if (!db || !shareData?.id || !shareData.ownerId || !shareData.imageId) return { success: false, code: "INVALID" };
  const now = Date.now();
  const deterministicKey = `${shareData.ownerId}_${shareData.imageId}`;

  try {
    await ensureD1SharesSchema(db);
    await expireStaleSharesD1(db, deterministicKey, now);
    const res = await db.prepare(`
      INSERT INTO user_shares_store (
        id, owner_id, image_id, media_type, status, expires_at, view_count,
        is_one_time, deterministic_key, password_hash, encrypted_share_key,
        created_at, updated_at, allow_download, slot
      )
      SELECT ?, ?, ?, ?, 'active', ?, 0, ?, ?, ?, ?, ?, ?, ?, 0
      WHERE (SELECT COUNT(*) FROM user_shares_store WHERE owner_id = ? AND ${LIVE_SHARE_SQL}) < ?
        AND NOT EXISTS (SELECT 1 FROM user_shares_store WHERE deterministic_key = ? AND status = 'active')
    `).bind(
      shareData.id, shareData.ownerId, shareData.imageId, shareData.mediaType || "image",
      shareData.expiresAt || null, shareData.isOneTime ? 1 : 0, deterministicKey,
      shareData.passwordHash || null, shareData.encryptedShareKey || null,
      now, now, shareData.allowDownload === false || shareData.isOneTime ? 0 : 1,
      shareData.ownerId, now, now - ONE_TIME_WINDOW_MS, MAX_ACTIVE_SHARES_PER_USER, deterministicKey
    ).run();
    if ((res?.meta?.changes ?? res?.changes ?? 0) === 1) return { success: true, slot: 0 };

    const mediaLink = await db.prepare(
      "SELECT 1 AS x FROM user_shares_store WHERE deterministic_key = ? AND status = 'active' LIMIT 1"
    ).bind(deterministicKey).first();
    return { success: false, code: mediaLink ? "MEDIA_ALREADY_SHARED" : "SHARE_LIMIT_REACHED" };
  } catch (err) {
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes("unique")) {
      return { success: false, code: msg.includes("slot") ? "MEDIA_ALREADY_SHARED" : "DUPLICATE_ID" };
    }
    console.error("[D1Shares] Failed to create share:", err);
    return { success: false, code: "DB_ERROR" };
  }
}
