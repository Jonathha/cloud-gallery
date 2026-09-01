import { isShareActive } from "./helpers.js";

export async function saveShareR2(bucket, id, deterministicKey, shareData, verifiedUid, imageId) {
  await bucket.put(`shares/${id}.json`, JSON.stringify({ ...shareData, status: 'active' }));
  await bucket.put(`active_shares/${deterministicKey}.json`, JSON.stringify({
    id,
    shareId: id,
    imageId,
    userId: verifiedUid,
    status: 'active',
    options: shareData.options,
    createdAt: shareData.createdAt,
    firstViewedAt: null
  }));
}

export async function getShareR2(bucket, shareId) {
  if (!bucket) return null;
  try {
    const obj = await bucket.get(`shares/${shareId}.json`);
    if (obj) return await obj.json();
  } catch (err) {
    console.warn("[getShareR2] Fetch error:", err);
  }
  return null;
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
  if (!bucket) return;
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
  } catch {}
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
