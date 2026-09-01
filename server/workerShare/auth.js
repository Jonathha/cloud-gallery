import { validateBanco1Token } from "../workerChat.js";
import { getFirestoreDocREST } from "../workerFirestoreREST.js";

export async function authenticateShareRequest(request) {
  const authHeader = request?.headers?.get("Authorization");
  if (!authHeader) {
    throw new Error("token de sessão ausente");
  }
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : "";
  if (!idToken) {
    throw new Error("token de sessão ausente");
  }
  const verifiedUser = await validateBanco1Token(authHeader);
  return { verifiedUser, idToken };
}

export async function checkMediaOwnership(imageId, userId, idToken) {
  try {
    const imgDoc = await getFirestoreDocREST('images', imageId, idToken);
    if (imgDoc && imgDoc.userId === userId) {
      return true;
    }
    const keyDoc = await getFirestoreDocREST('media_keys', imageId, idToken);
    if (keyDoc && keyDoc.userId === userId) {
      return true;
    }
  } catch (dbErr) {
    console.warn('[checkMediaOwnership] Firestore REST verification failed:', dbErr);
  }
  return false;
}
