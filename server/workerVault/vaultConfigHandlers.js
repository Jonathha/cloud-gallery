import { jsonResponse } from "../workerHelpers.js";
import { validateFirebaseTokenWorker } from "../workerStorageUtils.js";
import { getUserVaultConfig, saveUserVaultSetup } from "../workerD1Vault.js";
import { saveSecurityLogD1 } from "../workerD1Logs.js";
import { getDB } from "./vaultEnv.js";

export async function handleGetVaultConfig(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  const db = getDB(env);
  const config = await getUserVaultConfig(db, auth.user.uid, auth.token);
  return jsonResponse({ success: true, config: config || null });
}

export async function handleSaveVaultSetup(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  try {
    const body = await request.json();
    const db = getDB(env);
    const ok = await saveUserVaultSetup(db, auth.user.uid, body);
    if (ok) {
      const clientIp = request.headers.get("cf-connecting-ip") || "0.0.0.0";
      const userAgent = request.headers.get("user-agent") || "";
      await saveSecurityLogD1(db, {
        id: "vsetup_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        userId: auth.user.uid,
        eventType: "audit",
        ip: clientIp,
        userAgent,
        details: {
          action: "vault_setup",
          details: "Cofre configurado e inicializado com sucesso",
          userEmail: auth.user.email || ""
        },
        timestamp: Date.now()
      }).catch(() => {});
    }
    return jsonResponse({ success: ok });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
