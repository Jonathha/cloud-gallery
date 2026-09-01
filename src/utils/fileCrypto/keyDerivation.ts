import { encryptData, decryptData, deriveKey, exportKeyToBase64, importKeyFromBase64, generateRandomKey } from '../crypto';

export interface EncryptedVaultKey {
  ciphertext: string;
  iv: string;
  v: number;
}

export async function generateVaultMasterKey(): Promise<CryptoKey> {
  return generateRandomKey();
}

export async function wrapVaultKey(
  vmk: CryptoKey,
  kek: CryptoKey
): Promise<EncryptedVaultKey> {
  const exportedVmkBase64 = await exportKeyToBase64(vmk);
  const { ciphertext, iv } = await encryptData(exportedVmkBase64, kek);
  return {
    ciphertext,
    iv,
    v: 1,
  };
}

export async function unwrapVaultKey(
  encryptedVaultKey: { ciphertext: string; iv: string; v?: number },
  kek: CryptoKey
): Promise<CryptoKey> {
  if (!encryptedVaultKey || !encryptedVaultKey.ciphertext || !encryptedVaultKey.iv) {
    throw new Error("Estrutura de chave de cofre criptografada inválida");
  }
  const version = encryptedVaultKey.v || 1;
  if (version !== 1) {
    throw new Error(`Versão de key wrapping não suportada: ${version}`);
  }
  const vmkBase64 = await decryptData(
    encryptedVaultKey.ciphertext,
    encryptedVaultKey.iv,
    kek
  );
  return importKeyFromBase64(vmkBase64);
}

export function generateFileKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%!';
  let key = '';
  const array = new Uint32Array(15);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < 15; i++) {
    key += chars[array[i] % chars.length];
  }
  return key;
}

const derivedKeyCache = new Map<string, CryptoKey>();

export function clearDerivedKeyCache() {
  derivedKeyCache.clear();
}

export async function deriveFileKeyFast(fileKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const fileKeyBytes = encoder.encode(fileKey);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', fileKeyBytes);
  return window.crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function getOrDeriveCryptoKey(fileKey: string, fileSalt: string): Promise<CryptoKey> {
  const cacheKey = `${fileKey}:${fileSalt}`;
  let key = derivedKeyCache.get(cacheKey);
  if (!key) {
    if (fileSalt && fileSalt.startsWith("v2_")) {
      key = await deriveFileKeyFast(fileKey);
    } else {
      key = await deriveKey(fileKey, fileSalt);
    }
    derivedKeyCache.set(cacheKey, key);
  }
  return key;
}

export async function encryptFileKey(fileKey: string, masterKey: CryptoKey): Promise<{ ciphertext: string, iv: string }> {
  return encryptData(fileKey, masterKey);
}

export async function decryptFileKey(encryptedFileKey: string, iv: string, masterKey: CryptoKey): Promise<string> {
  return decryptData(encryptedFileKey, iv, masterKey);
}
