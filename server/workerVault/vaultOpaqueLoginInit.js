import * as opaque from "@serenity-kit/opaque";
import { jsonResponse } from "../workerHelpers.js";
import { validateFirebaseTokenWorker } from "../workerStorageUtils.js";
import { ensureD1VaultSchema } from "../workerD1Vault.js";
import { getDB, getServerSetup, isVaultRecordLocked } from "./vaultEnv.js";
import { buildOpaqueLoginResponse } from "./vaultOpaqueLoginResponse.js";

export async function handleOpaqueLoginInit(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  try {
    const body = await request.json();
    if (!body || !body.startLoginRequest) {
      return jsonResponse({ success: false, error: "startLoginRequest obrigatório" }, 400);
    }
    const db = getDB(env);
    await ensureD1VaultSchema(db);

    const row = await db.prepare("SELECT * FROM user_vault_store WHERE user_id = ?").bind(auth.user.uid).first();
    if (!row) {
      return jsonResponse({ success: false, error: "Cofre não configurado" }, 404);
    }

    if (isVaultRecordLocked(row)) {
      return jsonResponse({
        success: false,
        error: "Cofre bloqueado temporariamente por excesso de tentativas falhas.",
        lockedUntil: row.locked_until,
        failedAttempts: row.failed_attempts || 0
      }, 423);
    }

    if (!row.opaque_record) {
      return jsonResponse({ success: false, isLegacy: true, error: "Cofre ainda não migrado para OPAQUE" }, 400);
    }

    await opaque.ready;
    const serverSetup = await getServerSetup(env);
    const { serverLoginState, loginResponse } = opaque.server.startLogin({
      serverSetup,
      userIdentifier: auth.user.uid,
      registrationRecord: row.opaque_record,
      startLoginRequest: body.startLoginRequest
    });

    return jsonResponse(buildOpaqueLoginResponse(row, loginResponse, serverLoginState));
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
