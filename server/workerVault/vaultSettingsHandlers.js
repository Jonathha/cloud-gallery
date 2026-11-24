import { jsonResponse } from "../workerHelpers.js";
import { validateFirebaseTokenWorker } from "../workerStorageUtils.js";
import { updateVaultSettingsD1 } from "../workerD1Vault.js";
import { saveSecurityLogD1 } from "../workerD1Logs.js";
import { getDB } from "./vaultEnv.js";

export async function handleUpdateVaultSettings(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  try {
    const body = await request.json();
    const db = getDB(env);
    const ok = await updateVaultSettingsD1(db, auth.user.uid, body);
    if (ok) {
      const clientIp = request.headers.get("cf-connecting-ip") || "0.0.0.0";
      const userAgent = request.headers.get("user-agent") || "";
      await saveSecurityLogD1(db, {
        id: "vup_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        userId: auth.user.uid,
        eventType: "audit",
        ip: clientIp,
        userAgent,
        details: {
          action: "vault_pin_change",
          details: "Configurações de segurança/PIN do cofre atualizadas com sucesso",
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
