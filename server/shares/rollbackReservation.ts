import path from "path";
import fs from "node:fs/promises";
import { SHARES_DIR } from "../shareHelpers";
import {
  deleteFirestoreDocREST,
  getFirestoreDocREST,
  deleteFirestoreDocWithPreconditionREST
} from "../firestoreREST";

export async function rollbackShareReservation(
  id: string,
  authUid: string,
  imageId: string,
  idToken: string,
  claimKey: string = `${authUid}_${imageId}`
): Promise<void> {
  const deterministicKey = claimKey;
  const filePath = path.join(SHARES_DIR, `${id}.json`);
  try {
    const currentClaim = await getFirestoreDocREST('active_shares', deterministicKey, idToken);
    if (currentClaim && (currentClaim.shareId === id || currentClaim.id === id)) {
      if (currentClaim._updateTime) {
        try {
          await deleteFirestoreDocWithPreconditionREST('active_shares', deterministicKey, { updateTime: currentClaim._updateTime }, idToken);
        } catch {
          await deleteFirestoreDocREST('active_shares', deterministicKey, idToken);
        }
      } else {
        await deleteFirestoreDocREST('active_shares', deterministicKey, idToken);
      }
    }
    await deleteFirestoreDocREST('shares', id, idToken);
  } catch (cleanErr) {
    console.error('[ShareService] Compensation cleanup error:', cleanErr);
  }
  try { await fs.unlink(filePath); } catch {}
}
