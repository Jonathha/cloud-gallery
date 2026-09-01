import { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { dbPrimary } from "../../firebase";
import { deriveKey, decryptData } from "../../utils/crypto";
import { unwrapVaultKey, wrapVaultKey } from "../../utils/fileCrypto";
import { saveKeyToLocal } from "../../utils/db";
import { signVaultData, verifyVaultDataIntegrity, checkActiveIntrusion } from "../../utils/integrity";
import { UnlockResult } from "../AuthContextTypes";
import { getLockoutPenalty, registerFailedAttemptLogic, resetFailedAttemptsLogic } from "./vaultPenalty";

export async function unlockVaultLogic(
  pin: string,
  user: User,
  setCryptoKey: (key: CryptoKey | null) => void,
): Promise<UnlockResult> {
  try {
    let data: any = null;
    let cachedData = localStorage.getItem(`vault_data_${user.uid}`);

    if (!cachedData) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("vault_data_")) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              if (parsed.salt && parsed.verification) {
                cachedData = item;
                localStorage.setItem(`vault_data_${user.uid}`, item);
                break;
              }
            } catch (e) {}
          }
        }
      }
    }

    if (cachedData) {
      data = JSON.parse(cachedData);
      const isIntegrityValid = await verifyVaultDataIntegrity(
        user.uid,
        data.failedAttempts || 0,
        data.lockedUntil || null,
        data.integritySignature || null
      );
      if (!isIntegrityValid) {
        if (checkActiveIntrusion()) {
          console.warn("[INTEGRITY_SHIELD] Bypass detectado! Aplicando proteção máxima.");
          data.failedAttempts = 7;
          data.lockedUntil = Date.now() + getLockoutPenalty(7);
          data.integritySignature = await signVaultData(user.uid, data.failedAttempts, data.lockedUntil);
          localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));
        } else {
          console.log("[INTEGRITY_SHIELD] Sincronização de integridade necessária.");
        }
      }
    } else {
      let userDocExists = false;
      let remoteData: any = null;

      if (navigator.onLine) {
        try {
          const userDocPromise = getDoc(doc(dbPrimary, "users", user.uid));
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 1000),
          );
          const userDoc = (await Promise.race([
            userDocPromise,
            timeoutPromise,
          ])) as any;
          if (userDoc && userDoc.exists()) {
            userDocExists = true;
            remoteData = userDoc.data();
          }
        } catch (e) {
          console.warn("Could not retrieve remote vault config:", e);
        }
      }

      if (userDocExists && remoteData) {
        data = remoteData;
        const initialSig = await signVaultData(user.uid, data.failedAttempts || 0, data.lockedUntil || null);
        localStorage.setItem(
          `vault_data_${user.uid}`,
          JSON.stringify({
            salt: data.salt,
            verification: data.verification,
            encryptedVaultKey: data.encryptedVaultKey || null,
            keyWrappingVersion: data.keyWrappingVersion || null,
            encryptionMode: data.encryptionMode || (data.extraPassword ? 'custom_extra' : 'standard'),
            extraPassword: data.extraPassword,
            securityImageId: data.securityImageId,
            extraPasswordUpdatedAt: data.extraPasswordUpdatedAt || 0,
            securityImageIdUpdatedAt: data.securityImageIdUpdatedAt || 0,
            failedAttempts: data.failedAttempts || 0,
            lockedUntil: data.lockedUntil || null,
            integritySignature: initialSig,
          }),
        );
      }
    }

    // Sincronização Autoritativa do Firestore para Lockout (VL_VLT_01 Remediation)
    if (navigator.onLine && user && user.uid && !user.uid.startsWith("offline_user")) {
      try {
        const userDocPromise = getDoc(doc(dbPrimary, "users", user.uid));
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 1500),
        );
        const userDoc = (await Promise.race([userDocPromise, timeoutPromise])) as any;
        if (userDoc && userDoc.exists()) {
          const remoteData = userDoc.data();
          const remoteLockedUntil = remoteData.lockedUntil || null;
          const remoteFailedAttempts = remoteData.failedAttempts || 0;
          const now = Date.now();
          const isRemoteLocked = remoteLockedUntil && now < remoteLockedUntil;

          const localLockedUntil = data?.lockedUntil || null;
          const localFailedAttempts = data?.failedAttempts || 0;

          // Se o Firestore indicar que o usuário está bloqueado ou tiver contadores de falha superiores,
          // o estado remoto prevalece obrigatoriamente sobre o cache local.
          if (
            isRemoteLocked ||
            remoteFailedAttempts > localFailedAttempts ||
            (remoteLockedUntil && (!localLockedUntil || remoteLockedUntil > localLockedUntil))
          ) {
            if (!data) data = remoteData;
            data.failedAttempts = Math.max(localFailedAttempts, remoteFailedAttempts);
            data.lockedUntil = isRemoteLocked
              ? remoteLockedUntil
              : (remoteLockedUntil && remoteLockedUntil > (localLockedUntil || 0) ? remoteLockedUntil : localLockedUntil);
            data.integritySignature = await signVaultData(user.uid, data.failedAttempts, data.lockedUntil);
            localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));
          }
        }
      } catch (e) {
        console.warn("[LOCKOUT_SYNC] Erro na sincronização autoritativa remota de lockout:", e);
      }
    }

    const now = Date.now();
    if (data && data.lockedUntil && now < data.lockedUntil) {
      return {
        success: false,
        lockedUntil: data.lockedUntil,
        failedAttempts: data.failedAttempts,
      };
    }

    let isCorrect = false;
    if (data && data.salt && data.verification) {
      try {
        const pinKey = await deriveKey(pin, data.salt, true);
        const check = await decryptData(
          data.verification.ciphertext,
          data.verification.iv,
          pinKey,
        );
        if (check === "vault-check") {
          isCorrect = true;
          if (data.failedAttempts > 0) {
            await resetFailedAttemptsLogic(user);
          }

          let vmk: CryptoKey;
          if (data.encryptedVaultKey && data.encryptedVaultKey.ciphertext && data.encryptedVaultKey.iv) {
            try {
              vmk = await unwrapVaultKey(data.encryptedVaultKey, pinKey);
            } catch (unwrapErr) {
              console.error("Falha ao desembrulhar encryptedVaultKey:", unwrapErr);
              throw new Error("Falha ao recuperar a chave mestra do cofre");
            }
          } else {
            // Caso B — usuário ainda não migrado (legado):
            // O pinKey atual é a chave mestra original (VMK)
            vmk = pinKey;

            // Migração transparente e idempotente em segundo plano
            try {
              const wrapped = await wrapVaultKey(vmk, pinKey);
              data.encryptedVaultKey = wrapped;
              data.keyWrappingVersion = 1;
              localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));
              if (navigator.onLine) {
                setDoc(
                  doc(dbPrimary, "users", user.uid),
                  {
                    encryptedVaultKey: wrapped,
                    keyWrappingVersion: 1,
                  },
                  { merge: true }
                ).catch((migErr) => console.warn("Falha assíncrona ao migrar encryptedVaultKey no Firestore:", migErr));
              }
            } catch (migErr) {
              console.warn("Falha ao criar encryptedVaultKey durante unlock legado:", migErr);
            }
          }

          await saveKeyToLocal(user.uid, vmk);
          setCryptoKey(vmk);
          return { success: true };
        }
      } catch (e) {
        isCorrect = false;
      }
    }

    const { lockedUntil, failedAttempts } = await registerFailedAttemptLogic(user);
    return { success: false, lockedUntil, failedAttempts };
  } catch (error) {
    console.warn("Error during unlockVaultLogic, registering failed attempt:", error);
    try {
      const { lockedUntil, failedAttempts } = await registerFailedAttemptLogic(user);
      return { success: false, lockedUntil, failedAttempts };
    } catch (e) {
      return { success: false };
    }
  }
}
