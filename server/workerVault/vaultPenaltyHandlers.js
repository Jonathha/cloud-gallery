import { jsonResponse } from "../workerHelpers.js";
import { validateFirebaseTokenWorker } from "../workerStorageUtils.js";
import { recordVaultPenaltyD1, resetVaultPenaltyD1 } from "../workerD1Vault.js";
import { saveSecurityLogD1 } from "../workerD1Logs.js";
import { getDB } from "./vaultEnv.js";

export async function handleRecordVaultPenalty(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  try {
    const body = await request.json().catch(() => ({}));
    const db = getDB(env);
    const res = await recordVaultPenaltyD1(db, auth.user.uid, Boolean(body.isIntrusion));
    
    const clientIp = request.headers.get("cf-connecting-ip") || "0.0.0.0";
    const userAgent = request.headers.get("user-agent") || "";
    const isLocked = Boolean(res.lockedUntil && res.lockedUntil > Date.now());
    await saveSecurityLogD1(db, {
      id: "pen_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      userId: auth.user.uid,
      eventType: "audit",
      ip: clientIp,
      userAgent,
      details: {
        action: isLocked ? "vault_lockout" : "vault_failed_attempt",
        details: isLocked
          ? `Cofre bloqueado temporariamente até ${new Date(res.lockedUntil).toLocaleTimeString('pt-BR')} por excesso de tentativas incorretas`
          : `Tentativa ${res.failedAttempts}/5 de PIN incorreto no cofre`,
        attemptNumber: res.failedAttempts,
        maxAttempts: 5,
        locked: isLocked,
        userEmail: auth.user.email || ""
      },
      timestamp: Date.now()
    }).catch(() => {});

    return jsonResponse({ success: true, ...res });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

export async function handleResetVaultPenalty(request, env) {
  const auth = await validateFirebaseTokenWorker(request);
  if (!auth.authenticated || !auth.user?.uid) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }
  const db = getDB(env);
  const res = await resetVaultPenaltyD1(db, auth.user.uid);
  if (res.locked) {
    return jsonResponse({
      success: false,
      error: "Cofre bloqueado temporariamente. Não é possível redefinir penalidades durante o bloqueio ativo.",
      lockedUntil: res.lockedUntil
    }, 423);
  }
  return jsonResponse({ success: res.success });
}
