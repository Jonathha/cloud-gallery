import { User } from "firebase/auth";
import { signVaultData, verifyVaultDataIntegrity, checkActiveIntrusion } from "../../utils/integrity";
import { recordVaultPenaltyApi, resetVaultPenaltyApi } from "../../services/vaultApiService";

export const getLockoutPenalty = (failedAttempts: number): number => {
  if (failedAttempts === 3) return 30 * 1000;
  if (failedAttempts === 4) return 60 * 1000;
  if (failedAttempts === 5) return 2 * 60 * 1000;
  if (failedAttempts === 6) return 5 * 60 * 1000;
  if (failedAttempts >= 7) return 24 * 60 * 60 * 1000;
  return 0;
};

export async function registerFailedAttemptLogic(
  user: User,
): Promise<{ lockedUntil: number | null; failedAttempts: number }> {
  let data: any = null;
  const cachedData = localStorage.getItem(`vault_data_${user.uid}`);
  if (cachedData) {
    try {
      data = JSON.parse(cachedData);
    } catch (e) {}
  }

  if (!data) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("vault_data_")) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (parsed.salt && parsed.verification) {
              data = parsed;
              break;
            }
          } catch (e) {}
        }
      }
    }
  }

  if (!data) {
    data = { failedAttempts: 0 };
  }

  const isIntegrityValid = await verifyVaultDataIntegrity(
    user.uid,
    data.failedAttempts || 0,
    data.lockedUntil || null,
    data.integritySignature || null
  );

  let failedAttempts = 0;
  let lockedUntil: number | null = null;
  const isIntrusion = checkActiveIntrusion() || (!isIntegrityValid && (data.failedAttempts || 0) >= 3);

  const baseFailed = Number(data.failedAttempts) || 0;
  const targetFailedAttempts = isIntrusion ? Math.max(7, baseFailed + 1) : baseFailed + 1;

  // Atomic penalty registration in official D1 database via authenticated Worker
  if (navigator.onLine && user && user.uid && !user.uid.startsWith("offline_user")) {
    try {
      const remoteRes = await recordVaultPenaltyApi(user, isIntrusion);
      if (remoteRes) {
        if (typeof remoteRes.failedAttempts === "number" && remoteRes.failedAttempts > 0) {
          failedAttempts = remoteRes.failedAttempts;
        }
        if (remoteRes.lockedUntil) {
          lockedUntil = remoteRes.lockedUntil;
        }
      }
    } catch (e) {
      console.warn("[LOCKOUT_PENALTY] Erro ao registrar penalidade no D1:", e);
    }
  }

  if (!failedAttempts) {
    failedAttempts = targetFailedAttempts;
  }

  const now = Date.now();
  if ((!lockedUntil || lockedUntil <= now) && failedAttempts >= 3) {
    const penalty = getLockoutPenalty(failedAttempts);
    lockedUntil = penalty > 0 ? now + penalty : null;
  }

  data.failedAttempts = failedAttempts;
  data.lockedUntil = lockedUntil;

  data.integritySignature = await signVaultData(user.uid, failedAttempts, lockedUntil);
  localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));

  // Sync all other vault_data_ keys in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("vault_data_")) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          parsed.failedAttempts = failedAttempts;
          parsed.lockedUntil = lockedUntil;
          const kUid = key.replace("vault_data_", "");
          parsed.integritySignature = await signVaultData(kUid, failedAttempts, lockedUntil);
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      } catch (e) {}
    }
  }

  return { lockedUntil, failedAttempts };
}

export async function resetFailedAttemptsLogic(user: User): Promise<void> {
  let data: any = null;
  const cachedData = localStorage.getItem(`vault_data_${user.uid}`);
  if (cachedData) {
    try {
      data = JSON.parse(cachedData);
    } catch (e) {}
  }

  if (!data) {
    data = {};
  }

  data.failedAttempts = 0;
  data.lockedUntil = null;
  try {
    data.integritySignature = await signVaultData(user.uid, 0, null);
  } catch (e) {}
  localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("vault_data_")) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          parsed.failedAttempts = 0;
          parsed.lockedUntil = null;
          const kUid = key.replace("vault_data_", "");
          parsed.integritySignature = await signVaultData(kUid, 0, null);
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      } catch (e) {}
    }
  }

  if (navigator.onLine && user && user.uid && !user.uid.startsWith("offline_user")) {
    try {
      await resetVaultPenaltyApi(user);
    } catch (e) {
      console.warn("Error resetting failed attempts in D1:", e);
    }
  }
}
