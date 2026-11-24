import path from "path";
import fs from "node:fs/promises";
import { uploadToR2 } from "../r2Client";
import { SHARES_DIR } from "../shareHelpers";
import { setFirestoreDocREST, getFirestoreDocREST } from "../firestoreREST";

export async function persistShareFiles(
  id: string,
  authUid: string,
  imageId: string,
  shareData: any,
  idToken: string,
  claimKey: string = `${authUid}_${imageId}`
): Promise<void> {
  const filePath = path.join(SHARES_DIR, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify({ ...shareData, status: 'active' }), 'utf-8');
  const activePointerPath = path.join(SHARES_DIR, `active_${claimKey}.json`);
  await fs.writeFile(activePointerPath, JSON.stringify({
    id, shareId: id, imageId, userId: authUid, status: 'active',
    options: shareData.options, createdAt: shareData.createdAt, firstViewedAt: null
  }), 'utf-8');

  await uploadToR2(`shares/${id}.json`, { ...shareData, status: 'active' });
  await uploadToR2(`active_shares/${claimKey}.json`, {
    id, shareId: id, imageId, userId: authUid, status: 'active',
    options: shareData.options, createdAt: shareData.createdAt, firstViewedAt: null
  });

  try {
    const currentClaim = await getFirestoreDocREST('active_shares', claimKey, idToken);
    if (currentClaim && (currentClaim.shareId === id || currentClaim.id === id)) {
      await setFirestoreDocREST('active_shares', claimKey, { ...currentClaim, status: 'active', updatedAt: Date.now() }, idToken);
      await setFirestoreDocREST('shares', id, { ...shareData, status: 'active', ciphertext: shareData.ciphertext.length < 750 * 1024 ? shareData.ciphertext : '' }, idToken);
    }
  } catch (actErr) {
    console.warn('[ShareService] Status update to active failed:', actErr);
  }
}
