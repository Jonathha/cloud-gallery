import { getFirestoreDocREST } from "../firestoreREST";

/**
 * Valida a posse da mídia pelo usuário no Firestore através do ID Token
 */
export async function verifyMediaOwnership(
  imageId: string,
  authUid: string,
  idToken: string
): Promise<boolean> {
  try {
    const imgDoc = await getFirestoreDocREST('images', imageId, idToken);
    if (imgDoc && imgDoc.userId === authUid) {
      return true;
    }
    const keyDoc = await getFirestoreDocREST('media_keys', imageId, idToken);
    if (keyDoc && keyDoc.userId === authUid) {
      return true;
    }
  } catch (dbErr) {
    console.warn('[createShare] Firestore REST verification failed/skipped:', dbErr);
  }
  return false;
}

export function validateShareRequestBody(body: any): boolean {
  const { id, imageId, ciphertext, iv } = body || {};
  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id) || id.length < 16) {
    return false;
  }
  return Boolean(imageId && ciphertext && iv);
}

/** One-time view links can never allow downloads: the two options are mutually exclusive. */
export function validateShareOptionsCombination(options: any): string | null {
  if (options == null) return null;
  if (typeof options !== 'object' || Array.isArray(options)) return 'Opções de compartilhamento inválidas.';
  if (options.oneTimeView && options.allowDownload !== false) {
    return 'Visualização única não pode ser combinada com download permitido.';
  }
  return null;
}
