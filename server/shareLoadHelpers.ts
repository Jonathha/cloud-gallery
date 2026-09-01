import path from "path";
import fs from "node:fs/promises";
import { downloadFromR2, deleteFromR2 } from "./r2Client";

export async function loadShareData(
  shareId: string,
  filePath: string,
  driveService: any,
  db: any
): Promise<any> {
  if (!db) {
    console.error('[ShareService] Firestore is required to validate shares but is unavailable.');
    return null;
  }

  let firestoreData: any = null;
  try {
    const docSnap = await db.collection('shares').doc(shareId).get();
    if (!docSnap.exists) {
      console.log(`[ShareService] Share ${shareId} has been explicitly deleted according to Firestore.`);
      try { await fs.unlink(filePath); } catch (e) {}
      try { await deleteFromR2(`shares/${shareId}.json`); } catch (e) {}
      return null;
    }
    firestoreData = docSnap.data();
  } catch (e) {
    console.warn('[ShareService] Firestore state check failed:', e);
    return null; // Fail closed if DB read fails
  }

  // If ciphertext is fully stored in Firestore, we can just return it.
  if (firestoreData && firestoreData.ciphertext && firestoreData.ciphertext.length > 0) {
    return firestoreData;
  }

  // Otherwise, we need to load the ciphertext from local, drive, or R2 backups.
  let backupData: any = null;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    backupData = JSON.parse(content);
  } catch (err) {
    if (!backupData) {
      try {
        const r2Buffer = await downloadFromR2(`shares/${shareId}.json`);
        if (r2Buffer) {
          const r2Data = r2Buffer.toString('utf-8');
          backupData = JSON.parse(r2Data);
        }
      } catch (e) {}
    }
  }

  // Merge ciphertext from backup into our authorized Firestore metadata
  if (backupData && backupData.ciphertext) {
    firestoreData.ciphertext = backupData.ciphertext;
  }

  return firestoreData;
}

export async function handleOrphanOrExpiredShare(
  shareId: string,
  filePath: string,
  driveService: any,
  db: any
) {
  try { await fs.unlink(filePath); } catch (e) {}
  if (db) { try { await db.collection('shares').doc(shareId).delete(); } catch (e) {} }
  try { await deleteFromR2(`shares/${shareId}.json`); } catch (e) {}
}
