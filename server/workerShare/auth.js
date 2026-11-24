import { validateBanco1Token } from "../workerChat.js";
import { findUserMediaItem } from "../workerD1Storage.js";

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

export async function checkMediaOwnership(imageId, userId, idToken, env = null) {
  // D1 Operational Storage Verification (Primary & Sole Database)
  if (env) {
    const db = env.DB || env.DATABASE || env.d1;
    if (db) {
      try {
        const d1Item = await findUserMediaItem(db, userId, imageId);
        if (d1Item) {
          return true;
        }
      } catch (d1Err) {
        console.warn('[checkMediaOwnership] D1 verification failed:', d1Err);
      }
    }
  }
  return false;
}
