import { User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { dbPrimary } from "../../firebase";
import { deriveKey, generateSalt, encryptData } from "../../utils/crypto";
import { generateVaultMasterKey, wrapVaultKey } from "../../utils/fileCrypto";
import { saveKeyToLocal, removeKeyFromLocal } from "../../utils/db";
import { signVaultData } from "../../utils/integrity";

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

    const verification = await encryptData("vault-check", pinKey);
    const mode = modeInput || (extraPasswordInput ? 'custom_extra' : 'standard');

    // Gera a Vault Master Key (VMK) aleatória de 256 bits independente do PIN
    const vmk = await generateVaultMasterKey();
    const encryptedVaultKey = await wrapVaultKey(vmk, pinKey);

    let encryptedExtra = null;
    const now = Date.now();
    if (mode === 'custom_extra' && extraPasswordInput && extraPasswordInput.trim().length > 0) {
      encryptedExtra = await encryptData(extraPasswordInput.trim(), vmk);
    }

    try {
      await setDoc(doc(dbPrimary, "users", user.uid), {
        email: user.email ? user.email.toLowerCase().trim() : "",
        salt,
        verification,
        encryptedVaultKey,
        keyWrappingVersion: 1,
        encryptionMode: mode,
        extraPassword: encryptedExtra,
        extraPasswordUpdatedAt: encryptedExtra ? now : 0,
        createdAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.warn("Async setDoc failed or offline", error);
    }

    const initialSignature = await signVaultData(user.uid, 0, null);
    localStorage.setItem(
      `vault_data_${user.uid}`,
      JSON.stringify({
        salt,
        verification,
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
  } catch (error) {
    throw error;
  }
}

export async function lockVaultLogic(
  user: User | null,
  setCryptoKey: (key: CryptoKey | null) => void,
) {
  if (user) {
    await removeKeyFromLocal(user.uid);
  }
  setCryptoKey(null);
}
