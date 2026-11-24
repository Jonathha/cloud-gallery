import { ensureD1SharesSchema } from "./schema.js";
import { MAX_ACTIVE_SHARES_PER_USER, ONE_TIME_WINDOW_MS } from "./limits.js";

/** SQL predicate for a link that still counts toward the limit. Binds: (now, now - ONE_TIME_WINDOW_MS). */
export const LIVE_SHARE_SQL =
  "status = 'active' AND (expires_at IS NULL OR expires_at > ?) AND NOT (is_one_time = 1 AND first_viewed_at IS NOT NULL AND first_viewed_at <= ?)";

/** Marks expired or consumed links as inactive so they stop counting toward the limit. */
export async function expireStaleSharesD1(db, deterministicKey, now = Date.now()) {
  await db.prepare(
    `UPDATE user_shares_store SET status = 'expired', updated_at = ?
     WHERE deterministic_key = ? AND status = 'active' AND (
       (expires_at IS NOT NULL AND expires_at <= ?) OR
       (is_one_time = 1 AND first_viewed_at IS NOT NULL AND first_viewed_at <= ?)
     )`
  ).bind(now, deterministicKey, now, now - ONE_TIME_WINDOW_MS).run();
}

function mapShareRow(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    imageId: row.image_id,
    mediaType: row.media_type,
    status: row.status,
    expiresAt: row.expires_at,
    viewCount: row.view_count,
    isOneTime: !!row.is_one_time,
    deterministicKey: row.deterministic_key,
    passwordHash: row.password_hash,
    encryptedShareKey: row.encrypted_share_key,
    createdAt: row.created_at,
    firstViewedAt: row.first_viewed_at || null,
    options: {
      requirePassword: !!(row.encrypted_share_key || row.password_hash),
      allowDownload: row.allow_download !== 0 && !row.is_one_time,
      oneTimeView: !!row.is_one_time,
      expiresAt: row.expires_at || null
    }
  };
}

/** Lists every active link (newest first) for an owner/media pair. */
export async function findSharesD1(db, ownerId, imageId) {
  if (!db || !ownerId || !imageId) return [];
  await ensureD1SharesSchema(db);
  const deterministicKey = `${ownerId}_${imageId}`;
  await expireStaleSharesD1(db, deterministicKey);
  const { results } = await db.prepare(
    "SELECT * FROM user_shares_store WHERE deterministic_key = ? AND status = 'active' ORDER BY created_at DESC LIMIT ?"
  ).bind(deterministicKey, MAX_ACTIVE_SHARES_PER_USER).all();
  return (results || []).map(mapShareRow);
}

/** Backwards-compatible helper: the newest active link, or null. */
export async function findShareD1(db, ownerId, imageId) {
  const shares = await findSharesD1(db, ownerId, imageId);
  return shares[0] || null;
}

/** Counts active links for an owner/media pair after dropping stale ones. */
export async function countActiveSharesD1(db, ownerId, imageId) {
  if (!db || !ownerId || !imageId) return 0;
  await ensureD1SharesSchema(db);
  const deterministicKey = `${ownerId}_${imageId}`;
  await expireStaleSharesD1(db, deterministicKey);
  const row = await db.prepare(
    "SELECT COUNT(*) AS cnt FROM user_shares_store WHERE deterministic_key = ? AND status = 'active'"
  ).bind(deterministicKey).first();
  return Number(row?.cnt || 0);
}

/** Counts the owner's live links across every media (expired or consumed ones do not count). */
export async function countActiveSharesByOwnerD1(db, ownerId) {
  if (!db || !ownerId) return 0;
  await ensureD1SharesSchema(db);
  const now = Date.now();
  const row = await db.prepare(
    `SELECT COUNT(*) AS cnt FROM user_shares_store WHERE owner_id = ? AND ${LIVE_SHARE_SQL}`
  ).bind(ownerId, now, now - ONE_TIME_WINDOW_MS).first();
  return Number(row?.cnt || 0);
}

/** Lists the owner's live links across every media (newest first), without password/key material. */
export async function listActiveSharesByOwnerD1(db, ownerId) {
  if (!db || !ownerId) return [];
  await ensureD1SharesSchema(db);
  const now = Date.now();
  const { results } = await db.prepare(
    `SELECT * FROM user_shares_store WHERE owner_id = ? AND ${LIVE_SHARE_SQL} ORDER BY created_at DESC`
  ).bind(ownerId, now, now - ONE_TIME_WINDOW_MS).all();
  return (results || []).map(mapShareRow).map(({ passwordHash, encryptedShareKey, ...share }) => share);
}

