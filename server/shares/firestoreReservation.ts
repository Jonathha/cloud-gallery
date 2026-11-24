import { isShareActive } from "../shareHelpers";
import {
  getFirestoreDocREST,
  createFirestoreDocIfNotExistREST,
  updateFirestoreDocWithPreconditionREST
} from "../firestoreREST";
import { buildActiveClaimPayload } from "./shareDataBuilder";
import { claimKeysFor } from "./claimKeys";

/**
 * Reserves the first free link slot for the media and returns the claim key it took.
 * Throws SHARE_LIMIT_REACHED when every slot holds an active link. Slots are claimed
 * with create-if-not-exists / update-precondition writes, so concurrent requests
 * cannot take the same slot.
 */
export async function reserveShareInFirestoreREST(
  id: string,
  authUid: string,
  shareData: any,
  idToken: string,
  now: number
): Promise<string> {
  const existingShareDoc = await getFirestoreDocREST('shares', id, idToken);
  if (existingShareDoc) {
    const err: any = new Error('SHARE_ID_ALREADY_EXISTS');
    err.code = 'ALREADY_EXISTS';
    throw err;
  }

  const claimPayload = buildActiveClaimPayload(id, shareData.imageId, shareData.userId, shareData.options, now);
  let claimKey: string | null = null;
  for (const key of claimKeysFor(authUid, shareData.imageId)) {
    const existingClaim = await getFirestoreDocREST('active_shares', key, idToken);
    if (existingClaim && isShareActive(existingClaim, now)) continue;
    try {
      if (!existingClaim) {
        await createFirestoreDocIfNotExistREST('active_shares', key, { ...claimPayload, claimKey: key }, idToken);
      } else {
        await updateFirestoreDocWithPreconditionREST(
          'active_shares', key, { ...claimPayload, claimKey: key }, { updateTime: existingClaim._updateTime }, idToken
        );
      }
      claimKey = key;
      break;
    } catch {
      // Another request took this slot between our read and write: try the next one.
    }
  }
  if (!claimKey) {
    const err: any = new Error('SHARE_LIMIT_REACHED');
    err.code = 'SHARE_LIMIT_REACHED';
    throw err;
  }

  await createFirestoreDocIfNotExistREST('shares', id, {
    ...shareData,
    ciphertext: shareData.ciphertext.length < 750 * 1024 ? shareData.ciphertext : ''
  }, idToken);
  return claimKey;
}
