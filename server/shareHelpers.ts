import path from "path";
import fs from "node:fs/promises";
import { getDB } from "./firebaseAdmin";
import { IMAGES_DIR } from "./storageHelpers";
import { downloadFromR2, deleteFromR2 } from "./r2Client";

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
export const SHARES_DIR = path.resolve(UPLOADS_DIR, 'shares');

// Determines whether a share is currently active (not expired, not failed/revoked, and not consumed if one-time view)
export function isShareActive(data: any, now: number = Date.now()): boolean {
  if (!data || (!data.id && !data.shareId)) return false;
  
  // Explicit status checks
  if (data.status === 'failed' || data.status === 'revoked') {
    return false;
  }
  
  // Pending status (locks creation for up to 60 seconds to prevent concurrent creation)
  if (data.status === 'pending') {
    const createdAt = Number(data.createdAt || data.updatedAt || 0);
    if (createdAt && (now - createdAt > 60000)) {
      return false; // Timed out pending lock
    }
    return true;
  }

  // 1. Expired check
  if (data.options?.expiresAt && Number(data.options.expiresAt) <= now) {
    return false;
  }
  // 2. One-time view consumed check (> 60 seconds after first view)
  if (data.options?.oneTimeView && data.firstViewedAt && (now - Number(data.firstViewedAt) > 60000)) {
    return false;
  }
  return true;
}

// Verifies if the image still exists in the local file system, Google Drive, or Cloudflare R2
export async function checkImageExists(imageId: string): Promise<boolean> {
  if (!imageId) return false;
  
  // 1. Check local filesystem (.enc or .json)
  const localPathEnc = path.join(IMAGES_DIR, `${imageId}.enc`);
  const localPathJson = path.join(IMAGES_DIR, `${imageId}.json`);
  try {
    await fs.access(localPathEnc);
    return true;
  } catch (e) {}
  try {
    await fs.access(localPathJson);
    return true;
  } catch (e) {}

  // 2. Check Cloudflare R2
  try {
    const r2DataEnc = await downloadFromR2(`images/${imageId}.enc`);
    if (r2DataEnc) return true;
  } catch (e) {}
  try {
    const r2DataJson = await downloadFromR2(`images/${imageId}.json`);
    if (r2DataJson) return true;
  } catch (e) {}

  return false;
}

// Purges all shares associated with a deleted image
export async function deleteSharesForImage(imageId: string) {
  try {
    const db = getDB();
    if (!db) {
       console.error('[ShareService] No Firestore DB available to purge shares');
       return;
    }

    const sharesSnapshot = await db.collection('shares').where('imageId', '==', imageId).get();
    
    if (sharesSnapshot.empty) {
       return;
    }

    console.log(`[ShareService] Found ${sharesSnapshot.size} shares to purge for image ${imageId}`);

    const deletionPromises: Promise<any>[] = [];

    for (const doc of sharesSnapshot.docs) {
       const shareData = doc.data();
       const shareId = doc.id;
       const userId = shareData.userId;

       // 1. Delete from Firestore (shares collection)
       deletionPromises.push(doc.ref.delete().catch(() => {}));

       if (userId) {
          const deterministicKey = `${userId}_${imageId}`;
          
          // 2. Delete from Firestore (active_shares collection)
          deletionPromises.push(
             db.collection('active_shares').doc(deterministicKey).delete().catch(() => {})
          );
          
          // 3. Delete from R2 active_shares
          deletionPromises.push(
             deleteFromR2(`active_shares/${deterministicKey}.json`).catch(() => {})
          );
       }

       // 4. Delete from R2 shares
       deletionPromises.push(
          deleteFromR2(`shares/${shareId}.json`).catch(() => {})
       );

       // 5. Delete from local FS if it exists
       const localPath = path.join(SHARES_DIR, `${shareId}.json`);
       deletionPromises.push(
          fs.unlink(localPath).catch(() => {})
       );
    }

    await Promise.allSettled(deletionPromises);
    console.log(`[ShareService] Successfully purged all share artifacts for image ${imageId}`);

  } catch (err) {
    console.error('[ShareService] Error in deleteSharesForImage:', err);
  }
}

// Ensure local directory
export async function ensureSharesDir() {
  try {
    await fs.mkdir(SHARES_DIR, { recursive: true });
  } catch (err) {
    console.error('[ShareService] Failed to create shares directory:', err);
  }
}
ensureSharesDir();
