import * as opaque from "@serenity-kit/opaque";
import { jsonResponse } from "../workerHelpers.js";
import { validateFirebaseTokenWorker } from "../workerStorageUtils.js";
import { recordVaultPenaltyD1, resetVaultPenaltyD1 } from "../workerD1Vault.js";
import { getDB } from "./vaultEnv.js";

export async function handleOpaqueLoginFinish(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  try {
    const body = await request.json();
    if (!body || !body.serverLoginState || !body.finishLoginRequest) {
      return jsonResponse({ success: false, error: "Dados de finalização OPAQUE incompletos" }, 400);
    }
    await opaque.ready;
    let finishResult;
    try {
      finishResult = opaque.server.finishLogin({
        serverLoginState: body.serverLoginState,
        finishLoginRequest: body.finishLoginRequest
      });
    } catch (e) {
      finishResult = null;
    }

    const db = getDB(env);
    if (!finishResult || !finishResult.sessionKey) {
      const pen = await recordVaultPenaltyD1(db, auth.user.uid, false);
      return jsonResponse({
        success: false,
        error: "Falha na prova de autenticação OPAQUE",
        failedAttempts: pen.failedAttempts,
        lockedUntil: pen.lockedUntil
      }, 401);
    }

    await resetVaultPenaltyD1(db, auth.user.uid);
    return jsonResponse({ success: true, authenticated: true });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
