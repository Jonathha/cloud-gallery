import { encryptData, decryptData, decryptDataRaw, deriveKey, generateSalt } from '../crypto';
import { deriveFileKeyFast, getOrDeriveCryptoKey } from './keyDerivation';

export async function encryptWithFileKey(
  data: string,
  fileKey: string,
  providedSalt?: string
): Promise<{ ciphertext: string; iv: string; fileSalt: string }> {
  let fileSalt = providedSalt;
  if (!fileSalt) {
    const baseSalt = await generateSalt();
    fileSalt = "v2_" + baseSalt;
  }
  
  let cryptoKey: CryptoKey;
  if (fileSalt.startsWith("v2_")) {
    cryptoKey = await deriveFileKeyFast(fileKey);
  } else {
    cryptoKey = await deriveKey(fileKey, fileSalt);
  }
  
  const encrypted = await encryptData(data, cryptoKey);
  return {
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    fileSalt
  };
}

export async function decryptWithFileKey(
  ciphertext: string,
  iv: string,
  fileKey: string,
  fileSalt: string
): Promise<string> {
  const cryptoKey = await getOrDeriveCryptoKey(fileKey, fileSalt);
  return decryptData(ciphertext, iv, cryptoKey);
}

export async function decryptWithFileKeyRaw(
  ciphertext: string,
  iv: string,
  fileKey: string,
  fileSalt: string
): Promise<ArrayBuffer> {
  const cryptoKey = await getOrDeriveCryptoKey(fileKey, fileSalt);
  return decryptDataRaw(ciphertext, iv, cryptoKey);
}
