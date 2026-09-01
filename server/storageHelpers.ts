import path from "path";
import fs from "node:fs/promises";
import { getR2Client, downloadFromR2, listKeysFromR2 } from "./r2Client";
import { isEncBinary, getMetadataFromEnc } from "./storageHelpersEnc";

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
export const IMAGES_DIR = path.resolve(UPLOADS_DIR, 'images');
export const THUMBNAILS_DIR = path.resolve(UPLOADS_DIR, 'thumbnails');

export async function ensureDir() {
  try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
  } catch (err) {
    console.error('[StorageController] Failed to create storage directories:', err);
  }
}

export async function recoverFromDrive(_userId: string, _localIds: Set<string>) {
  // Google Drive removed
}

export async function recoverFromR2(userId: string, localIds: Set<string>) {
  const r2Client = getR2Client();
  if (!r2Client) return;

  try {
    const keys = await listKeysFromR2("images/");
    const promises = keys.map(async (key) => {
      if (key.startsWith("images/")) {
        let imageId = "";
        let ext = "";
        if (key.endsWith(".enc")) {
          imageId = key.substring("images/".length, key.length - 4);
          ext = ".enc";
        } else if (key.endsWith(".json")) {
          imageId = key.substring("images/".length, key.length - 5);
          ext = ".json";
        }

        if (imageId && !localIds.has(imageId)) {
          console.log(`[R2 Auto-Recovery] Restoring missing file from R2: ${key}`);
          try {
            const r2Buffer = await downloadFromR2(key);
            if (r2Buffer) {
              let fileUserId: string | null = null;
              if (isEncBinary(r2Buffer)) {
                const meta = getMetadataFromEnc(r2Buffer);
                fileUserId = meta?.userId;
              } else {
                const parsed = JSON.parse(r2Buffer.toString('utf-8'));
                fileUserId = parsed?.userId;
              }

              if (fileUserId === userId) {
                const destPath = path.join(IMAGES_DIR, `${imageId}${ext}`);
                await fs.writeFile(destPath, r2Buffer);
                localIds.add(imageId);
                console.log(`[R2 Auto-Recovery] Restored local file from R2: ${imageId}${ext}`);
              }
            }
          } catch (dlErr) {
            console.error(`[R2 Auto-Recovery] Failed to restore file ${imageId} from R2:`, dlErr);
          }
        }
      }
    });
    await Promise.all(promises);
  } catch (r2SyncErr) {
    console.warn("[R2 Auto-Recovery] Skipped R2 list sync:", r2SyncErr);
  }
}

/**
 * Checks whether a media ID already exists and whether the requesting user is allowed to write/modify it.
 * If the media exists and belongs to another user, returns { exists: true, allowed: false }.
 * If the media exists and belongs to the authenticated user, returns { exists: true, allowed: true }.
 * If the media does not exist, returns { exists: false, allowed: true }.
 */
export async function checkMediaOwnership(id: string, authUid: string, idToken?: string): Promise<{ exists: boolean; allowed: boolean }> {
  if (!id || !authUid) return { exists: false, allowed: false };

  // 1. Check local filesystem (.enc or legacy .json)
  const localPathEnc = path.join(IMAGES_DIR, `${id}.enc`);
  try {
    const buf = await fs.readFile(localPathEnc);
    if (buf && buf.length > 0) {
      if (isEncBinary(buf)) {
        const meta = getMetadataFromEnc(buf);
        if (meta?.userId && meta.userId !== authUid) {
          return { exists: true, allowed: false };
        }
      }
      return { exists: true, allowed: true };
    }
  } catch (e) {}

  const localPathJson = path.join(IMAGES_DIR, `${id}.json`);
  try {
    const jsonStr = await fs.readFile(localPathJson, 'utf-8');
    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      if (parsed?.userId && parsed.userId !== authUid) {
        return { exists: true, allowed: false };
      }
      return { exists: true, allowed: true };
    }
  } catch (e) {}

  // 2. Check Cloudflare R2
  try {
    const r2DataEnc = await downloadFromR2(`images/${id}.enc`);
    if (r2DataEnc && r2DataEnc.length > 0) {
      if (isEncBinary(r2DataEnc)) {
        const meta = getMetadataFromEnc(r2DataEnc);
        if (meta?.userId && meta.userId !== authUid) {
          return { exists: true, allowed: false };
        }
      }
      return { exists: true, allowed: true };
    }
  } catch (e) {}

  try {
    const r2DataJson = await downloadFromR2(`images/${id}.json`);
    if (r2DataJson && r2DataJson.length > 0) {
      const parsed = JSON.parse(r2DataJson.toString('utf-8'));
      if (parsed?.userId && parsed.userId !== authUid) {
        return { exists: true, allowed: false };
      }
      return { exists: true, allowed: true };
    }
  } catch (e) {}

  // 3. Check Firestore using user's token
  if (idToken) {
    try {
      const { getFirestoreDocREST } = await import("./firestoreREST");
      const imgDoc = await getFirestoreDocREST('images', id, idToken);
      if (imgDoc && imgDoc.userId && imgDoc.userId !== authUid) {
        return { exists: true, allowed: false };
      }
      const keyDoc = await getFirestoreDocREST('media_keys', id, idToken);
      if (keyDoc && keyDoc.userId && keyDoc.userId !== authUid) {
        return { exists: true, allowed: false };
      }
    } catch (dbErr: any) {
      if (dbErr?.message && (dbErr.message.includes('403') || dbErr.message.includes('PERMISSION_DENIED'))) {
        return { exists: true, allowed: false };
      }
    }
  }

  return { exists: false, allowed: true };
}
