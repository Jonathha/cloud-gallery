import { jsonResponse } from "../workerHelpers.js";
import { validateFirebaseTokenWorker } from "../workerStorageUtils.js";
import { findUserMediaItem } from "../workerD1Storage.js";
import { saveMediaKeyD1 } from "../workerD1Vault.js";
import { getDB } from "./vaultEnv.js";

export async function handleSaveMediaKey(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  try {
    const body = await request.json();
    if (!body || !body.imageId || !body.keyCiphertext) {
      return jsonResponse({ success: false, error: "Dados incompletos para salvar chave de mídia." }, 400);
    }
    const db = getDB(env);

    if (db) {
      const userMedia = await findUserMediaItem(db, auth.user.uid, body.imageId);
      if (!userMedia) {
        return jsonResponse({ success: false, error: "Acesso negado: a mídia associada não pertence a este usuário ou não existe." }, 403);
      }
    }

    const ok = await saveMediaKeyD1(db, body.imageId, auth.user.uid, body);
    if (!ok) {
      return jsonResponse({ success: false, error: "Acesso negado: conflito de titularidade ao salvar chave." }, 403);
    }
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
