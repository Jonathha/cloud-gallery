import { User } from "firebase/auth";
import { deriveKey, generateSalt, encryptData } from "../../utils/crypto";
import { generateVaultMasterKey, wrapVaultKey } from "../../utils/fileCrypto";
import { saveKeyToLocal, removeKeyFromLocal } from "../../utils/db";
import { signVaultData } from "../../utils/integrity";
import { isQuickAccessEnabled, setManualLocked } from "../../utils/quickAccess";
import { saveVaultSetupApi } from "../../services/vaultApiService";
import { recordAuditEvent } from "../../services/adminAuditService";

export async function setupVaultLogic(
  pin: string,
  user: User,
  setCryptoKey: (key: CryptoKey | null) => void,
  setNeedsSetup: (needs: boolean) => void,
  extraPasswordInput?: string | null,
  modeInput?: 'standard' | 'custom_extra'
) {
  try {
    const salt = await generateSalt();
    const pinKey = await deriveKey(pin, salt, true);

    // 1. Gera a Vault Master Key (VMK) aleatória de 256 bits independente do PIN
    const vmk = await generateVaultMasterKey();
    const encryptedVaultKey = await wrapVaultKey(vmk, pinKey);

    const mode = modeInput || (extraPasswordInput ? 'custom_extra' : 'standard');
    let encryptedExtra = null;
    const now = Date.now();
    if (mode === 'custom_extra' && extraPasswordInput && extraPasswordInput.trim().length > 0) {
      encryptedExtra = await encryptData(extraPasswordInput.trim(), vmk);
    }

    // 2. Envia os dados necessários para persistência no D1 via Web Crypto (sem OPAQUE e sem senha em texto)
    if (navigator.onLine && user && user.uid && !user.uid.startsWith("offline_user")) {
      const ok = await saveVaultSetupApi(user, {
        salt,
        encryptedVaultKey,
        encryptionMode: mode,
        extraPassword: encryptedExtra,
        extraPasswordUpdatedAt: encryptedExtra ? now : 0,
      });

      if (!ok) {
        throw new Error("Erro de comunicação com o servidor ao salvar o cofre no D1. Verifique sua conexão e tente novamente.");
      }
    }

    const initialSignature = await signVaultData(user.uid, 0, null);
    localStorage.setItem(
      `vault_data_${user.uid}`,
      JSON.stringify({
        vaultVersion: 2,
        salt,
        encryptedVaultKey,
        keyWrappingVersion: 1,
        encryptionMode: mode,
        extraPassword: encryptedExtra,
        securityImageId: null,
        extraPasswordUpdatedAt: encryptedExtra ? now : 0,
        securityImageIdUpdatedAt: 0,
        failedAttempts: 0,
        lockedUntil: null,
        integritySignature: initialSignature,
      }),
    );

    await saveKeyToLocal(user.uid, vmk);
    setCryptoKey(vmk);
    setNeedsSetup(false);
    recordAuditEvent({
      type: 'vault_setup',
      action: 'vault_setup',
      userId: user.uid,
      userEmail: user.email || undefined,
      method: mode === 'custom_extra' ? 'Proteção Dupla (PIN + Senha Extra)' : 'Padrão (PIN)',
      result: 'Cofre criptográfico configurado com sucesso',
      status: 'success',
      details: `Configuração inicial do cofre concluída (Modo: ${mode === 'custom_extra' ? 'Proteção Dupla' : 'Padrão'})`
    }).catch(() => {});
  } catch (error) {
    throw error;
  }
}

export async function lockVaultLogic(
  user: User | null,
  setCryptoKey: (key: CryptoKey | null) => void,
) {
  if (user) {
    if (isQuickAccessEnabled(user.uid)) {
      setManualLocked(user.uid, true);
    } else {
      await removeKeyFromLocal(user.uid);
    }
  }
  setCryptoKey(null);
}
