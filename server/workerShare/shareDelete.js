import { jsonResponse } from "../workerHelpers.js";
import { extractIdFromUrl, isValidShareId } from "./helpers.js";
import { authenticateShareRequest } from "./auth.js";
import { deleteShareD1 } from "../workerD1Shares.js";
import { deleteShareR2 } from "./r2.js";

export async function handleDeleteShare(request, env) {
  const shareId = extractIdFromUrl(request);
  if (!shareId || !isValidShareId(shareId)) return jsonResponse({ success: false, error: "Invalid ID" }, 400);

  let verifiedUser;
  try {
    const authResult = await authenticateShareRequest(request);
    verifiedUser = authResult.verifiedUser;
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  const db = env.DB || env.DATABASE || env.d1;
  const bucket = env.R2;
  if (!db || !bucket) return jsonResponse({ success: false, error: "Serviço de compartilhamento temporariamente indisponível." }, 503);

  let d1Res;
  try {
    d1Res = await deleteShareD1(db, shareId, verifiedUser.uid);
  } catch (err) {
    console.error("[handleDeleteShare] D1 delete failed:", err);
    return jsonResponse({ success: false, error: "Não foi possível revogar o compartilhamento." }, 500);
  }
  if (!d1Res?.success || !d1Res.deterministicKey) {
    return jsonResponse({ success: false, error: "Link de compartilhamento não pertence ao usuário ou não existe." }, 404);
  }

  try {
    const r2Deleted = await deleteShareR2(bucket, shareId, d1Res.deterministicKey);
    if (!r2Deleted) {
      return jsonResponse({ success: false, error: "O link foi revogado, mas a limpeza do armazenamento falhou. Tente novamente." }, 500);
    }
  } catch (err) {
    console.error("[handleDeleteShare] R2 delete failed:", err);
    return jsonResponse({ success: false, error: "O link foi revogado, mas a limpeza do armazenamento falhou. Tente novamente." }, 500);
  }
  return jsonResponse({ success: true });
}
