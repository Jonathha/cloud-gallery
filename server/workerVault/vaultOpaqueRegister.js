import * as opaque from "@serenity-kit/opaque";
import { jsonResponse } from "../workerHelpers.js";
import { validateFirebaseTokenWorker } from "../workerStorageUtils.js";
import { saveOpaqueVaultSetupD1 } from "../workerD1Vault.js";
import { getDB, getServerSetup } from "./vaultEnv.js";

export async function handleOpaqueRegisterInit(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  try {
    const body = await request.json();
    if (!body || !body.registrationRequest) {
      return jsonResponse({ success: false, error: "registrationRequest obrigatório" }, 400);
    }
    await opaque.ready;
    const serverSetup = await getServerSetup(env);
    const { registrationResponse } = opaque.server.createRegistrationResponse({
      serverSetup,
      userIdentifier: auth.user.uid,
      registrationRequest: body.registrationRequest
    });
    return jsonResponse({ success: true, registrationResponse });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

export async function handleOpaqueRegisterFinish(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  try {
    const body = await request.json();
    if (!body || !body.registrationRecord || !body.encryptedVaultKey) {
      return jsonResponse({ success: false, error: "Dados incompletos para registro OPAQUE" }, 400);
    }
    const db = getDB(env);
    const ok = await saveOpaqueVaultSetupD1(db, auth.user.uid, body);
    return jsonResponse({ success: ok });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
