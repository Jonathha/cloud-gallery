import { jsonResponse } from "../workerHelpers.js";
import { validateFirebaseTokenWorker } from "../workerStorageUtils.js";
import { getUserVaultConfig, getMediaKeyD1, deleteMediaKeyD1 } from "../workerD1Vault.js";
import { getDB } from "./vaultEnv.js";

export async function handleGetMediaKey(request, env, imageId) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  const db = getDB(env);

  const vaultConfig = await getUserVaultConfig(db, auth.user.uid, auth.token);
  if (vaultConfig && vaultConfig.lockedUntil && Date.now() < vaultConfig.lockedUntil) {
    return jsonResponse({
      success: false,
      error: "Cofre bloqueado temporariamente por excesso de tentativas falhas.",
      lockedUntil: vaultConfig.lockedUntil
    }, 423);
  }

  const res = await getMediaKeyD1(db, imageId, auth.user.uid, auth.token);
  if (res.exists && !res.allowed) {
    return jsonResponse({ success: false, error: "Acesso negado: a chave pertence a outro usuário." }, 403);
  }
  if (!res.exists || !res.key) {
    return jsonResponse({ success: false, error: "Chave não encontrada" }, 404);
  }
  return jsonResponse({ success: true, key: res.key });
}

export async function handleDeleteMediaKey(request, env, imageId) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  const db = getDB(env);
  const delRes = await deleteMediaKeyD1(db, imageId, auth.user.uid);
  if (delRes.forbidden) {
    return jsonResponse({ success: false, error: "Acesso negado: a chave pertence a outro usuário." }, 403);
  }
  return jsonResponse({ success: delRes.success });
}
