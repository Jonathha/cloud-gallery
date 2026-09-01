import { User } from "firebase/auth";
import { doc, setDoc, runTransaction } from "firebase/firestore";
import { dbPrimary } from "../../firebase";
import { signVaultData, verifyVaultDataIntegrity, checkActiveIntrusion } from "../../utils/integrity";

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

  // Transação atômica no Firestore para evitar Lost Update / Race Condition sob falhas concorrentes
  if (navigator.onLine && user && user.uid && !user.uid.startsWith("offline_user")) {
    try {
      const userRef = doc(dbPrimary, "users", user.uid);
      await runTransaction(dbPrimary, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        let remoteFailedAttempts = 0;
        let remoteLockedUntil: number | null = null;
        if (userDoc.exists()) {
          const rData = userDoc.data();
          remoteFailedAttempts = rData.failedAttempts || 0;
          remoteLockedUntil = rData.lockedUntil || null;
        }

        const baseFailed = Math.max(data.failedAttempts || 0, remoteFailedAttempts);
        let txFailed = baseFailed + 1;

        if (checkActiveIntrusion()) {
          txFailed = Math.max(7, txFailed);
        } else if (!isIntegrityValid && txFailed < 3) {
          // safe sync
        } else if (!isIntegrityValid) {
          txFailed = Math.max(txFailed, 7);
        }

        const penalty = getLockoutPenalty(txFailed);
        const now = Date.now();
        let txLocked = penalty > 0 ? now + penalty : null;

        if (remoteLockedUntil && now < remoteLockedUntil) {
          txLocked = Math.max(txLocked || 0, remoteLockedUntil);
        }

        failedAttempts = txFailed;
        lockedUntil = txLocked;

        transaction.set(userRef, { failedAttempts: txFailed, lockedUntil: txLocked }, { merge: true });
      });
    } catch (e) {
      console.warn("[LOCKOUT_PENALTY] Erro em transação atômica remota:", e);
    }
  }

  if (!failedAttempts) {
    const baseFailed = data.failedAttempts || 0;
    failedAttempts = baseFailed + 1;

    if (checkActiveIntrusion()) {
      failedAttempts = Math.max(7, failedAttempts);
    } else if (!isIntegrityValid && failedAttempts < 3) {
      // safe sync
    } else if (!isIntegrityValid) {
      failedAttempts = Math.max(failedAttempts, 7);
    }

    const penalty = getLockoutPenalty(failedAttempts);
    const now = Date.now();
    lockedUntil = penalty > 0 ? now + penalty : null;
  }

  data.failedAttempts = failedAttempts;
  data.lockedUntil = lockedUntil;

  data.integritySignature = await signVaultData(user.uid, failedAttempts, lockedUntil);
  localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));

  // Sync all other vault_data_ keys in localStorage to prevent bypass via stale keys
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
  let data;
  const cachedData = localStorage.getItem(`vault_data_${user.uid}`);
  if (cachedData) {
    data = JSON.parse(cachedData);
    if (data.failedAttempts > 0) {
      data.failedAttempts = 0;
      data.lockedUntil = null;
      
      data.integritySignature = await signVaultData(user.uid, 0, null);
      localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));

      if (navigator.onLine && user && user.uid && !user.uid.startsWith("offline_user")) {
        setDoc(
          doc(dbPrimary, "users", user.uid),
          {
            failedAttempts: 0,
            lockedUntil: null,
          },
          { merge: true },
        ).catch((e) => console.warn("Error resetting failed attempts remote:", e));
      }
    }
  }
}
