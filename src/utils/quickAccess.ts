import { User } from "firebase/auth";
import { getKeyFromLocal, saveKeyToLocal, removeKeyFromLocal, getAllImagesFromCache } from "./db";
import { exportKeyToBase64, importKeyFromBase64, deriveKey, decryptData } from "./crypto";
import { unwrapVaultKey } from "./fileCrypto";
import { clearQuickAccessCache, populateMissingQuickAccessThumbnails } from "./quickAccessCache";

const PREFIX = "vault_quick_access_";
const KEY_BACKUP_PREFIX = "vault_qa_key_";
const MANUAL_LOCK_PREFIX = "vault_manual_lock_";

/**
 * Checks if Quick Access is active for the specified user UID on this device.
 */
export function isQuickAccessEnabled(uid: string | null | undefined): boolean {
  if (!uid) return false;
  try {
    return localStorage.getItem(`${PREFIX}${uid}`) === "true";
  } catch {
    return false;
  }
}

/**
 * Gets the UID of any user currently having Quick Access enabled on this device.
 */
export function getActiveQuickAccessUid(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        if (localStorage.getItem(k) === "true") {
          return k.replace(PREFIX, "");
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Checks if the vault was explicitly locked manually by the user in this session.
 */
export function isManuallyLocked(uid: string | null | undefined): boolean {
  if (!uid) return false;
  try {
    return sessionStorage.getItem(`${MANUAL_LOCK_PREFIX}${uid}`) === "true";
  } catch {
    return false;
  }
}

/**
 * Sets or clears the manual lock flag for the session.
 */
export function setManualLocked(uid: string | null | undefined, locked: boolean): void {
  if (!uid) return;
  try {
    if (locked) {
      sessionStorage.setItem(`${MANUAL_LOCK_PREFIX}${uid}`, "true");
    } else {
      sessionStorage.removeItem(`${MANUAL_LOCK_PREFIX}${uid}`);
    }
  } catch {}
}

/**
 * Saves the Vault Master Key in device storage (IndexedDB + local backup).
 */
export async function saveQuickAccessKey(uid: string, key: CryptoKey): Promise<void> {
  try {
    // 1. Store directly in IndexedDB keys table
    await saveKeyToLocal(uid, key);

    // 2. Export raw base64 backup in localStorage for resilient fast access
    try {
      const b64 = await exportKeyToBase64(key);
      localStorage.setItem(`${KEY_BACKUP_PREFIX}${uid}`, b64);
    } catch (e) {
      console.warn("[QuickAccess] LocalStorage key backup failed (non-fatal):", e);
    }

    // 3. Mark enabled
    localStorage.setItem(`${PREFIX}${uid}`, "true");
    sessionStorage.removeItem(`${MANUAL_LOCK_PREFIX}${uid}`);
  } catch (error) {
    console.error("[QuickAccess] Failed to save quick access key:", error);
    throw error;
  }
}

/**
 * Retrieves the Vault Master Key stored locally on this device.
 */
export async function getQuickAccessKey(uid: string): Promise<CryptoKey | null> {
  if (!isQuickAccessEnabled(uid)) return null;

  try {
    // 1. Try IndexedDB
    const idbKey = await getKeyFromLocal(uid);
    if (idbKey) return idbKey;

    // 2. Fallback to localStorage backup
    const b64 = localStorage.getItem(`${KEY_BACKUP_PREFIX}${uid}`);
    if (b64) {
      const imported = await importKeyFromBase64(b64);
      // Re-seed IndexedDB
      await saveKeyToLocal(uid, imported).catch(() => {});
      return imported;
    }
  } catch (error) {
    console.warn("[QuickAccess] Error retrieving key from local store:", error);
  }

  return null;
}

/**
 * Disables Quick Access and securely purges the stored key from this device.
 */
export async function disableQuickAccess(uid: string): Promise<void> {
  try {
    localStorage.removeItem(`${PREFIX}${uid}`);
    localStorage.removeItem(`${KEY_BACKUP_PREFIX}${uid}`);
    sessionStorage.removeItem(`${MANUAL_LOCK_PREFIX}${uid}`);
    await removeKeyFromLocal(uid).catch(() => {});
    await clearQuickAccessCache(uid).catch(() => {});
  } catch (error) {
    console.error("[QuickAccess] Failed to disable quick access:", error);
  }
}

/**
 * True when the current session is inside the decoy (fake) vault.
 */
export function isFakeVaultSession(): boolean {
  try {
    return sessionStorage.getItem("is_fake_vault_active") === "true";
  } catch {
    return false;
  }
}

function formatWait(ms: number): string {
  const totalSec = Math.max(1, Math.ceil(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.ceil(totalSec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.ceil(min / 60)} h`;
}

const ATTEMPTS_PREFIX = "vault_qa_attempts_";

function getAttempts(uid: string): { count: number; lockedUntil: number } {
  try {
    const raw = localStorage.getItem(`${ATTEMPTS_PREFIX}${uid}`);
    if (raw) {
      const p = JSON.parse(raw);
      return { count: Number(p.count) || 0, lockedUntil: Number(p.lockedUntil) || 0 };
    }
  } catch {}
  return { count: 0, lockedUntil: 0 };
}

function setAttempts(uid: string, count: number, lockedUntil: number): void {
  try {
    if (count === 0) localStorage.removeItem(`${ATTEMPTS_PREFIX}${uid}`);
    else localStorage.setItem(`${ATTEMPTS_PREFIX}${uid}`, JSON.stringify({ count, lockedUntil }));
  } catch {}
}

// Limite próprio da tela de Acesso Rápido (NÃO afeta o bloqueio do cofre).
function quickAccessPenalty(count: number): number {
  if (count < 3) return 0;
  if (count === 3) return 30 * 1000;
  if (count === 4) return 60 * 1000;
  return 2 * 60 * 1000;
}

/**
 * Verifies the vault password of the CURRENT user (local data only, never another
 * account) and enables Quick Access if correct. Wrong attempts here use their own
 * counter and never touch the vault's failedAttempts/lockout. Blocked in the decoy vault.
 */
export async function verifyAndEnableQuickAccess(
  pin: string,
  user: User,
  setCryptoKey: (key: CryptoKey | null) => void
): Promise<{ success: boolean; error?: string }> {
  if (!pin || pin.trim().length === 0) {
    return { success: false, error: "Digite a sua senha atual do cofre." };
  }
  if (isFakeVaultSession()) {
    return { success: false, error: "Indisponível neste cofre." };
  }

  const att = getAttempts(user.uid);
  if (att.lockedUntil > Date.now()) {
    return { success: false, error: `Aguarde ${formatWait(att.lockedUntil - Date.now())} para tentar novamente.` };
  }

  try {
    let data: any = null;
    try {
      const raw = localStorage.getItem(`vault_data_${user.uid}`);
      data = raw ? JSON.parse(raw) : null;
    } catch {}

    if (!data || !data.salt || !(data.encryptedVaultKey || data.verification)) {
      return { success: false, error: "Dados do cofre não encontrados neste aparelho." };
    }

    let vmk: CryptoKey | null = null;
    try {
      const pinKey = await deriveKey(pin, data.salt, true);
      if (data.encryptedVaultKey && data.encryptedVaultKey.ciphertext && data.encryptedVaultKey.iv) {
        vmk = await unwrapVaultKey(data.encryptedVaultKey, pinKey);
      } else {
        const check = await decryptData(data.verification.ciphertext, data.verification.iv, pinKey);
        vmk = check === "vault-check" ? pinKey : null;
      }
    } catch {
      vmk = null;
    }

    if (!vmk) {
      const count = att.count + 1;
      const wait = quickAccessPenalty(count);
      setAttempts(user.uid, count, wait ? Date.now() + wait : 0);
      return {
        success: false,
        error: wait
          ? `Senha incorreta. Aguarde ${formatWait(wait)} para tentar novamente.`
          : "Senha incorreta. Verifique e tente novamente.",
      };
    }

    setAttempts(user.uid, 0, 0);
    await saveQuickAccessKey(user.uid, vmk);
    setCryptoKey(vmk);

    const key = vmk;
    getAllImagesFromCache(user.uid).then(cachedImages => {
      if (cachedImages && cachedImages.length > 0) {
        populateMissingQuickAccessThumbnails(user.uid, cachedImages, key).catch(() => {});
      }
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    console.error("[QuickAccess] Verification error:", err);
    return { success: false, error: "Erro ao validar a senha. Tente novamente." };
  }
}
