import { isShareActive } from "./helpers.js";

export async function saveShareR2(bucket, id, deterministicKey, shareData, verifiedUid, imageId) {
  if (!bucket) return null;

  // D1 is the authority for the active share. Keep only the per-share
  // R2 object here; writing a shared active_shares pointer would race with
  // concurrent creates because R2 and D1 cannot participate in one transaction.
  const previousShareObj = await bucket.get(`shares/${id}.json`);
  const previousShare = previousShareObj ? await previousShareObj.json() : null;

  await bucket.put(
    `shares/${id}.json`,
    JSON.stringify({ ...shareData, status: "active" })
  );

  return { previousShare };
}

export async function rollbackShareR2(bucket, id, deterministicKey, previousState) {
  if (!bucket || !previousState) return false;
  try {
    if (previousState.previousShare) {
      await bucket.put(
        `shares/${id}.json`,
        JSON.stringify(previousState.previousShare)
      );
    } else {
      await bucket.delete(`shares/${id}.json`);
    }

    return true;
  } catch (err) {
    console.error("[rollbackShareR2] R2 rollback failed:", err);
    return false;
  }
}

export async function getShareR2(bucket, shareId) {
  if (!bucket) return null;
  const obj = await bucket.get(`shares/${shareId}.json`);
  return obj ? await obj.json() : null;
}

export async function getActiveShareR2(bucket, deterministicKey) {
  if (!bucket || !deterministicKey) return null;
  try {
    const obj = await bucket.get(`active_shares/${deterministicKey}.json`);
    if (obj) return await obj.json();
  } catch (err) {
    console.warn("[getActiveShareR2] Fetch error:", err);
  }
  return null;
}

export async function deleteShareR2(bucket, shareId, deterministicKey) {
  if (!bucket) return true;
  try {
    await bucket.delete(`shares/${shareId}.json`);
    if (deterministicKey) {
      const activeObj = await bucket.get(`active_shares/${deterministicKey}.json`);
      if (activeObj) {
        const activeData = await activeObj.json();
        if (activeData?.shareId === shareId || activeData?.id === shareId) {
          await bucket.delete(`active_shares/${deterministicKey}.json`);
        }
      }
    }
    return true;
  } catch (err) {
    console.error("[deleteShareR2] R2 delete failed:", err);
    return false;
  }
}

export async function searchSharesFallbackR2(bucket, imageId, userId, now) {
  if (!bucket) return [];
  try {
    const matchingShares = [];
    const list = await bucket.list({ prefix: "shares/", limit: 50 });
    for (const obj of list.objects) {
      if (obj.key.endsWith(".json")) {
        const item = await bucket.get(obj.key);
        if (item) {
          const data = await item.json();
          if (data && data.imageId === imageId && data.userId === userId) {
            if (isShareActive(data, now)) {
              matchingShares.push(data);
              break;
            }
          }
        }
      }
    }
    matchingShares.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return matchingShares;
  } catch (r2Err) {
    console.warn('[searchSharesFallbackR2] R2 search failed:', r2Err);
    return [];
  }
}
