import { ensureD1SharesSchema as ensureSchema } from "./workerD1Shares/schema.js";
import { findShareD1 as findShare, findSharesD1 as findShares, countActiveSharesD1 as countActiveShares, countActiveSharesByOwnerD1 as countActiveSharesByOwner, listActiveSharesByOwnerD1 as listActiveSharesByOwner } from "./workerD1Shares/lookup.js";
export { MAX_SHARES_PER_MEDIA, MAX_ACTIVE_SHARES_PER_USER } from "./workerD1Shares/limits.js";
import { createShareD1 as createShare } from "./workerD1Shares/create.js";
import { getShareForViewD1 as getShareForView } from "./workerD1Shares/view.js";
import { deleteShareD1 as deleteShare } from "./workerD1Shares/delete.js";

/**
 * Compatibility layer: keep the existing route imports unchanged.
 * Each wrapper delegates to the dedicated implementation module.
 * The public function names and argument order remain stable.
 * Do not move D1 logic back into this entry point.
 */
/** Keeps the historical import path stable for existing Worker routes. */
export async function ensureD1SharesSchema(db) {
  return ensureSchema(db);
}

export async function findShareD1(db, ownerId, imageId) {
  return findShare(db, ownerId, imageId);
}

export async function findSharesD1(db, ownerId, imageId) {
  return findShares(db, ownerId, imageId);
}

export async function countActiveSharesD1(db, ownerId, imageId) {
  return countActiveShares(db, ownerId, imageId);
}

export async function countActiveSharesByOwnerD1(db, ownerId) {
  return countActiveSharesByOwner(db, ownerId);
}

export async function listActiveSharesByOwnerD1(db, ownerId) {
  return listActiveSharesByOwner(db, ownerId);
}

export async function createShareD1(db, shareData) {
  return createShare(db, shareData);
}

export async function getShareForViewD1(db, shareId, clientIp = null) {
  return getShareForView(db, shareId, clientIp);
}

export async function deleteShareD1(db, shareId, ownerId) {
  return deleteShare(db, shareId, ownerId);
}
