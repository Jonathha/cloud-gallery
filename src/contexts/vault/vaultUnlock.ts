import { User } from "firebase/auth";
import { deriveKey, decryptData } from "../../utils/crypto";
import { unwrapVaultKey, wrapVaultKey } from "../../utils/fileCrypto";
import { saveKeyToLocal } from "../../utils/db";
import { signVaultData } from "../../utils/integrity";
import { UnlockResult } from "../AuthContextTypes";
import { registerFailedAttemptLogic, resetFailedAttemptsLogic } from "./vaultPenalty";
import { fetchVaultConfigApi } from "../../services/vaultApiService";
import { recordAuditEvent } from "../../services/adminAuditService";

export async function unlockVaultLogic(
  pin: string,
  user: User,
  setCryptoKey: (key: CryptoKey | null) => void,
): Promise<UnlockResult> {
  try {
    let cachedData = localStorage.getItem(`vault_data_${user.uid}`);
    let data: any = cachedData ? JSON.parse(cachedData) : null;

    // Se não houver dados locais e houver internet, sincroniza uma vez do D1
    if (!data && navigator.onLine && user && user.uid && !user.uid.startsWith("offline_user")) {
      try {
        const remoteData = await fetchVaultConfigApi(user);
        if (remoteData && remoteData.salt && remoteData.encryptedVaultKey) {
          const initialSig = await signVaultData(user.uid, remoteData.failedAttempts || 0, remoteData.lockedUntil || null);
          const syncedPayload = {
            vaultVersion: remoteData.vaultVersion || 2,
            salt: remoteData.salt,
            encryptedVaultKey: remoteData.encryptedVaultKey,
            keyWrappingVersion: remoteData.keyWrappingVersion || 1,
            encryptionMode: remoteData.encryptionMode || (remoteData.extraPassword ? 'custom_extra' : 'standard'),
            extraPassword: remoteData.extraPassword,
            securityImageId: remoteData.securityImageId,
            extraPasswordUpdatedAt: remoteData.extraPasswordUpdatedAt || 0,
            securityImageIdUpdatedAt: remoteData.securityImageIdUpdatedAt || 0,
            failedAttempts: remoteData.failedAttempts || 0,
            lockedUntil: remoteData.lockedUntil || null,
            integritySignature: initialSig,
          };
          localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(syncedPayload));
          data = syncedPayload;
        }
      } catch (syncErr) {
        console.warn("[UNLOCK_SYNC] Erro ao sincronizar configuração remota:", syncErr);
      }
    }

    if (!data || !data.salt || !data.encryptedVaultKey) {
      throw new Error("Configurações do cofre não encontradas localmente. Conecte-se à internet para sincronizar pela primeira vez.");
    }

    // 1. Verificação de lockout local
    const now = Date.now();
    if (data.lockedUntil && now < data.lockedUntil) {
      return {
        success: false,
        lockedUntil: data.lockedUntil,
        failedAttempts: data.failedAttempts || 0,
      };
    }

    // 2. DESBLOQUEIO CRIPTOGRÁFICO LOCAL 100% OFFLINE
    // Deriva a chave do PIN usando PBKDF2 e tenta desembrulhar a VMK com AES-GCM
    try {
      const pinKey = await deriveKey(pin, data.salt, true);
      let vmk: CryptoKey;

      if (data.encryptedVaultKey && data.encryptedVaultKey.ciphertext && data.encryptedVaultKey.iv) {
        vmk = await unwrapVaultKey(data.encryptedVaultKey, pinKey);
      } else {
        // Fallback para cofre legado que não possuía encryptedVaultKey separado
        if (data.verification) {
          const check = await decryptData(data.verification.ciphertext, data.verification.iv, pinKey);
          if (check !== "vault-check") {
            throw new Error("PIN incorreto");
          }
        }
        vmk = pinKey;
        const wrapped = await wrapVaultKey(vmk, pinKey);
        data.encryptedVaultKey = wrapped;
        localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));
      }

      // Desembrulhamento AES-GCM bem-sucedido: O PIN é válido!
      await resetFailedAttemptsLogic(user);
      await saveKeyToLocal(user.uid, vmk);
      sessionStorage.setItem(`vault_active_salt_${user.uid}`, data.salt);
      setCryptoKey(vmk);
      recordAuditEvent({
        type: 'vault_unlock',
        action: 'vault_unlock',
        userId: user.uid,
        userEmail: user.email || undefined,
        method: 'PIN (AES-GCM 256-bit)',
        result: 'Cofre desbloqueado com sucesso',
        status: 'success',
        details: 'Cofre desbloqueado com sucesso via PIN'
      }).catch(() => {});
      return { success: true };
    } catch (unwrapErr) {
      // Se falhou no cache local mas o usuário está online, tenta sincronizar uma vez com a configuração canônica do servidor
      // Isso previne que cache local corrompido ou de troca de senha em outro aparelho bloqueie a senha correta
      if (navigator.onLine && user && user.uid && !user.uid.startsWith("offline_user")) {
        try {
          const freshRemote = await fetchVaultConfigApi(user);
          if (
            freshRemote &&
            freshRemote.salt &&
            freshRemote.encryptedVaultKey &&
            (freshRemote.salt !== data.salt ||
              JSON.stringify(freshRemote.encryptedVaultKey) !== JSON.stringify(data.encryptedVaultKey))
          ) {
            const freshPinKey = await deriveKey(pin, freshRemote.salt, true);
            const freshVmk = await unwrapVaultKey(freshRemote.encryptedVaultKey, freshPinKey);
            
            // Senha bateu com os dados atualizados do servidor! Atualiza o cache local
            data.salt = freshRemote.salt;
            data.encryptedVaultKey = freshRemote.encryptedVaultKey;
            data.vaultVersion = freshRemote.vaultVersion || 2;
            data.failedAttempts = 0;
            data.lockedUntil = null;
            data.integritySignature = await signVaultData(user.uid, 0, null);
            localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));

            await resetFailedAttemptsLogic(user);
            await saveKeyToLocal(user.uid, freshVmk);
            sessionStorage.setItem(`vault_active_salt_${user.uid}`, data.salt);
            setCryptoKey(freshVmk);
            return { success: true };
          }
        } catch (resyncErr) {
          // Senha realmente incorreta também no servidor
        }
      }

      // Falha na tag de autenticação AES-GCM -> PIN incorreto
      const { lockedUntil, failedAttempts } = await registerFailedAttemptLogic(user);
      return { success: false, lockedUntil, failedAttempts };
    }
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
