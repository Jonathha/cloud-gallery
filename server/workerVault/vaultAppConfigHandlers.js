import { jsonResponse } from "../workerHelpers.js";
import { validateFirebaseTokenWorker } from "../workerStorageUtils.js";
import { isUserAdmin } from "../workerLogs/auth.js";
import { getAppConfigD1, setAppConfigD1 } from "../workerD1Config.js";
import { registerUserDeviceD1 } from "../workerD1Auth.js";
import { getDB } from "./vaultEnv.js";

export async function handleGetAppConfig(request, env) {
  const db = getDB(env);
  const config = await getAppConfigD1(db, "app");
  return jsonResponse({ success: true, config });
}

export async function handleSetAppConfig(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !isUserAdmin(auth.user?.email, env, auth.user?.email_verified)) {
    return jsonResponse({ success: false, error: "Acesso restrito a administradores." }, 403);
  }
  try {
    const body = await request.json();
    const db = getDB(env);
    const ok = await setAppConfigD1(db, "app", body);
    return jsonResponse({ success: ok });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

export async function handleRegisterDeviceToken(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  try {
    const body = await request.json();
    const db = getDB(env);
    const ok = await registerUserDeviceD1(db, auth.user.uid, body.token, body.platform || "android");
    return jsonResponse({ success: ok });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
