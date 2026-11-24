import { queryFirestoreREST } from "../workerFirestoreREST.js";
import { ensureD1UserSchema } from "./schema.js";
import { getUserMetadataList, saveUserMediaItem } from "./operations.js";

/**
 * Repairs/backfills encryption parameters in D1 for mídias that were recovered in R2
 * but whose D1 records have stale or mismatched encryption keys.
 * Preserves all historical fields (takenAt, uploadedAt, createdAt, etc.) and updates D1 in-place.
 */
export async function repairStaleD1UserMetadataFromR2(db, bucket, userId, userItems, targetRepairId = null) {
  if (!db || !bucket || !userId || !Array.isArray(userItems) || userItems.length === 0) {
    return userItems;
  }
  try {
    let hasUpdates = false;

    // Filter items to repair. If targetRepairId is specified, only repair that specific item.
    const itemsToProcess = targetRepairId 
      ? userItems.filter(item => item && item.id === targetRepairId)
      : userItems;

    if (itemsToProcess.length === 0) {
      return userItems;
    }

    // Process in batches of 5 parallel requests to avoid Cloudflare subrequest/CPU limits
    const concurrencyLimit = 5;
    for (let i = 0; i < itemsToProcess.length; i += concurrencyLimit) {
      const chunk = itemsToProcess.slice(i, i + concurrencyLimit);
      await Promise.all(chunk.map(async (item) => {
        if (!item || !item.id) return;

        try {
          const r2Obj = await bucket.get(`images/${item.id}.enc`, { range: { offset: 0, length: 16384 } });
          if (!r2Obj) return;

          const r2Buf = await r2Obj.arrayBuffer();
          if (!r2Buf || r2Buf.byteLength < 8) return;

          const view = new DataView(r2Buf);
          const magic = (view.getUint8(0) << 24) | (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);
          if (magic === 0x454e4331 || magic === 0x454e4332) {
            const metaLen = view.getUint32(4, false);
            if (8 + metaLen <= r2Buf.byteLength) {
              const metaBytes = new Uint8Array(r2Buf, 8, metaLen);
              const r2Meta = JSON.parse(new TextDecoder().decode(metaBytes));

              if (
                r2Meta &&
                r2Meta.fileKeyCiphertext &&
                (r2Meta.fileKeyCiphertext !== item.fileKeyCiphertext ||
                 r2Meta.iv !== item.iv ||
                 r2Meta.fileSalt !== item.fileSalt)
              ) {
                console.log(`[D1 Repair] Found stale encryption keys in D1 for recovered item ${item.id}. Repairing D1 from R2 header...`);
                const repairedMeta = {
                  id: item.id,
                  userId: userId,
                  iv: r2Meta.iv || item.iv,
                  thumbnailIv: r2Meta.thumbnailIv || item.thumbnailIv || "",
                  fileKeyCiphertext: r2Meta.fileKeyCiphertext,
                  fileKeyIv: r2Meta.fileKeyIv || item.fileKeyIv || "",
                  fileSalt: r2Meta.fileSalt || item.fileSalt || ""
                };

                const saved = await saveUserMediaItem(db, userId, repairedMeta);
                if (saved) {
                  const idx = userItems.findIndex(ui => ui && ui.id === item.id);
                  if (idx !== -1) {
                    userItems[idx] = {
                      ...userItems[idx],
                      ...repairedMeta
                    };
                    hasUpdates = true;
                  }
                }
              }
            }
          }
        } catch (itemErr) {
          // Continue quietly on single item error
        }
      }));
    }

    if (hasUpdates) {
      console.log(`[D1 Repair] Successfully repaired D1 encryption metadata for user ${userId}`);
    }
  } catch (err) {
    console.warn("[D1 Repair] Warning during metadata repair check:", err);
  }
  return userItems;
}

/**
 * Migrates existing historical metadata from Firestore to D1 for a user if D1 has no chunks yet.
 * Strictly preserves:
 * - mediaId / id
 * - userId / ownerId
 * - fileName / name
 * - contentType / mimeType
 * - fileSize / totalSize
 * - width, height, duration
 * - isVideo, isProtected
 * - takenAt (original capture date, NOT altered)
 * - uploadedAt (original upload date, NOT altered)
 * - createdAt, timestamp
 * - r2Key (images/{id}.enc)
 * - thumbnailKey (thumbnails/{id}.enc)
 * - iv, thumbnailIv, fileKeyCiphertext, fileKeyIv, fileSalt
 */
export async function migrateUserFromFirestoreIfEmpty(db, userId, idToken) {
  if (!db || !userId) return;
  try {
    await ensureD1UserSchema(db);

    // Retrieve existing items in D1 to prevent duplicate insertions
    const existingD1Items = await getUserMetadataList(db, userId);
    const existingIds = new Set(existingD1Items.map((i) => i.id));

    // Load historical records from Firestore
    let fsDocs = [];
    try {
      fsDocs = await queryFirestoreREST("images", userId, idToken);
    } catch (fsErr) {
      console.warn("[D1 Migration] Firestore query returned error or empty:", fsErr.message);
      return;
    }

    if (!Array.isArray(fsDocs) || fsDocs.length === 0) {
      return;
    }

    // Filter only historical docs that are NOT yet in D1
    const unmigratedDocs = fsDocs.filter((doc) => !existingIds.has(doc.id));
    if (unmigratedDocs.length === 0) {
      return; // All historical items already present in D1
    }

    console.log(`[D1 Migration] Migrating ${unmigratedDocs.length} missing historical media items from Firestore to D1 for user ${userId}`);

    const now = Date.now();
    for (const doc of unmigratedDocs) {
      const item = {
        id: doc.id,
        userId: userId,
        fileName: doc.fileName || doc.name || `midia_${doc.id}`,
        name: doc.name || doc.fileName || `midia_${doc.id}`,
        contentType: doc.contentType || (doc.type === "video" || doc.isVideo ? "video/webm" : "image/jpeg"),
        fileSize: doc.fileSize || doc.totalSize || doc.size || 0,
        totalSize: doc.totalSize || doc.fileSize || doc.size || 0,
        width: doc.width || 0,
        height: doc.height || 0,
        duration: doc.duration || 0,
        isVideo: doc.isVideo || doc.type === "video" || false,
        isProtected: doc.isProtected || false,
        takenAt: doc.takenAt || null, // Historical takenAt strictly preserved
        uploadedAt: doc.uploadedAt || (doc.createdAt ? new Date(doc.createdAt).toISOString() : null), // Historical uploadedAt strictly preserved
        createdAt: doc.createdAt || doc.timestamp || now,
        timestamp: doc.timestamp || doc.createdAt || now,
        r2Key: doc.r2Key || `images/${doc.id}.enc`,
        thumbnailKey: doc.thumbnailKey || `thumbnails/${doc.id}.enc`,
        iv: doc.iv || "",
        thumbnailIv: doc.thumbnailIv || "",
        fileKeyCiphertext: doc.fileKeyCiphertext || "",
        fileKeyIv: doc.fileKeyIv || "",
        fileSalt: doc.fileSalt || ""
      };
      await saveUserMediaItem(db, userId, item);
    }

    console.log(`[D1 Migration] Successfully synced ${unmigratedDocs.length} missing historical items to D1 for user ${userId}`);
  } catch (err) {
    console.error("[D1 Migration] Critical error during user migration:", err);
  }
}
