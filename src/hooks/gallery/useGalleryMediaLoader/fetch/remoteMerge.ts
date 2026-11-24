import { saveImageToCache, getImageFromCache, removeImageFromCache } from "../../../../utils/db";
import { saveMediaDimensions } from "../../../../utils/aspectRatioCache";

export async function mergeRemoteAndCache(cachedImages: any[], remoteList: any[], currentUserId?: string) {
  const cachedMap = new Map(cachedImages.map((img: any) => [img.id, img]));
  const mergedMap = new Map<string, any>();
  const newOrAltered: any[] = [];
  const remoteIdSet = new Set(remoteList.map((r: any) => r.id));

  let recentlyDeleted: string[] = [];
  try {
    recentlyDeleted = JSON.parse(sessionStorage.getItem('recently_deleted_ids_v1') || '[]');
  } catch {}
  const deletedSet = new Set(recentlyDeleted);

  for (const s of remoteList) {
    if (deletedSet.has(s.id)) continue;
    // Proporção vinda do D1: a grade já nasce com o formato certo (sem esperar a miniatura carregar)
    if (s.width > 0 && s.height > 0) saveMediaDimensions(s.id, s.width, s.height, s.duration > 0 ? s.duration : undefined);
    const targetUserId = s.userId || s.uid || currentUserId;
    let cached = cachedMap.get(s.id);
    if (!cached) {
      const dbRecord = await getImageFromCache(s.id);
      if (dbRecord && dbRecord.ciphertext && dbRecord.ciphertext !== "chunked_vault_data") {
        cached = { ...dbRecord, userId: targetUserId };
        cachedMap.set(s.id, cached);
      }
    }
    if (!cached) {
      const item = {
        id: s.id, userId: targetUserId, ciphertext: s.ciphertext || (s.isChunked ? "chunked_vault_data" : ""), iv: s.iv || "",
        createdAt: s.createdAt, isChunked: s.isChunked || false, chunkCount: s.chunkCount || 1,
        contentType: s.contentType || "image/png", totalSize: s.totalSize || 0,
        thumbnailCiphertext: s.thumbnailCiphertext || "", thumbnailIv: s.thumbnailIv || "",
        fileKeyCiphertext: s.fileKeyCiphertext, fileKeyIv: s.fileKeyIv, fileSalt: s.fileSalt,
        takenAt: s.takenAt || null,
        uploadedAt: s.uploadedAt || null,
      };
      await saveImageToCache(item);
      mergedMap.set(item.id, item);
      newOrAltered.push(item);
    } else {
      const resolvedUserId = cached.userId || targetUserId;
      const preferCachedKeys = cached.isRecovered || (cached.fileSalt?.startsWith("v2_") && !s.fileSalt?.startsWith("v2_"));
      const resolvedFileKeyCiphertext = preferCachedKeys ? (cached.fileKeyCiphertext || s.fileKeyCiphertext) : (s.fileKeyCiphertext || cached.fileKeyCiphertext);
      const resolvedFileKeyIv = preferCachedKeys ? (cached.fileKeyIv || s.fileKeyIv) : (s.fileKeyIv || cached.fileKeyIv);
      const resolvedFileSalt = preferCachedKeys ? (cached.fileSalt || s.fileSalt) : (s.fileSalt || cached.fileSalt);
      const resolvedIv = preferCachedKeys ? (cached.iv || s.iv) : (s.iv || cached.iv || "");

      const altered = cached.createdAt !== s.createdAt || 
        (s.thumbnailCiphertext && cached.thumbnailCiphertext !== s.thumbnailCiphertext) || 
        cached.contentType !== (s.contentType || "image/png") || 
        cached.totalSize !== (s.totalSize || 0) || 
        cached.userId !== resolvedUserId ||
        (!preferCachedKeys && s.fileKeyCiphertext && cached.fileKeyCiphertext !== s.fileKeyCiphertext) ||
        (!preferCachedKeys && s.iv && cached.iv !== s.iv) ||
        (!preferCachedKeys && s.fileSalt && cached.fileSalt !== s.fileSalt);
      const item = {
        ...cached,
        userId: resolvedUserId,
        createdAt: s.createdAt || cached.createdAt,
        contentType: s.contentType || cached.contentType || "image/png",
        totalSize: s.totalSize || cached.totalSize || 0,
        thumbnailCiphertext: preferCachedKeys ? (s.thumbnailCiphertext || "") : (s.thumbnailCiphertext || cached.thumbnailCiphertext || ""),
        thumbnailIv: preferCachedKeys ? (s.thumbnailIv || "") : (s.thumbnailIv || cached.thumbnailIv || ""),
        fileKeyCiphertext: resolvedFileKeyCiphertext,
        fileKeyIv: resolvedFileKeyIv,
        fileSalt: resolvedFileSalt,
        iv: resolvedIv,
        takenAt: s.takenAt || cached.takenAt || null,
        uploadedAt: s.uploadedAt || cached.uploadedAt || null,
      };

      if (altered || !cached.userId) {
        await saveImageToCache(item);
        if (altered) {
          newOrAltered.push(item);
        }
      }
      mergedMap.set(item.id, item);
    }
  }

  // Purge local cache items belonging to current user that were deleted from server,
  // but PRESERVE recently added or local pending items so they appear immediately and are never lost
  for (const cached of cachedImages) {
    if (cached.id && !remoteIdSet.has(cached.id)) {
      const isRecentlyCreated = cached.createdAt && (Date.now() - Number(cached.createdAt) < 15 * 60 * 1000);
      const isLocalPending = !!cached.isLocalPending || !!cached.isSyncPending;

      if (isRecentlyCreated || isLocalPending) {
        // Keep in mergedMap so the user sees the photo in the gallery immediately
        mergedMap.set(cached.id, cached);
      } else if (!cached.userId || cached.userId === currentUserId) {
        await removeImageFromCache(cached.id);
      }
    }
  }

  return { finalMergedList: Array.from(mergedMap.values()), newOrAltered };
}
