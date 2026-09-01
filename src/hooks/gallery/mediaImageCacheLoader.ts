import { DecryptedImage } from "../../types";
import { decryptDataRaw } from "../../utils/crypto";
import { 
  decryptFileKey, 
  decryptWithFileKeyRaw, 
  registerImageObjectURL,
  decryptedBufferToBlobUrl
} from "../../utils/fileCrypto";

export function handleDecryptedData(decryptedBuffer: ArrayBuffer, contentType: string): string {
  return decryptedBufferToBlobUrl(decryptedBuffer, contentType);
}

export async function loadImageFromCache(
  img: DecryptedImage,
  cached: any,
  activeKey: CryptoKey,
  isPreload: boolean,
  setSelectedImage: (url: string | null) => void,
  getActiveId?: () => string | null
): Promise<boolean> {
  let decryptedUrl = "";
  if (cached.fileKeyCiphertext && cached.fileKeyIv && cached.fileSalt && activeKey) {
    try {
      const fileKeyStr = await decryptFileKey(cached.fileKeyCiphertext, cached.fileKeyIv, activeKey);
      const decryptedBuffer = await decryptWithFileKeyRaw(cached.ciphertext as string, cached.iv, fileKeyStr, cached.fileSalt);
      decryptedUrl = handleDecryptedData(decryptedBuffer, cached.contentType || "image/jpeg");
    } catch (e) {
      console.warn("Local envelope decryption failed, attempting direct key fallback...", e);
      try {
        const decryptedBuffer = await decryptDataRaw(cached.ciphertext as string, cached.iv, activeKey);
        decryptedUrl = handleDecryptedData(decryptedBuffer, cached.contentType || "image/jpeg");
      } catch (fallbackErr) {
        console.warn("Local direct decryption also failed, cache may be stale or corrupt.", fallbackErr);
      }
    }
  } else if (activeKey && cached.ciphertext && cached.iv) {
    try {
      const decryptedBuffer = await decryptDataRaw(cached.ciphertext as string, cached.iv, activeKey);
      decryptedUrl = handleDecryptedData(decryptedBuffer, cached.contentType || "image/jpeg");
    } catch (e) {
      console.warn("Local direct decryption failed", e);
    }
  }

  if (decryptedUrl) {
    registerImageObjectURL(img.id, decryptedUrl);
    img.originalUrl = decryptedUrl;
    if (!isPreload) {
      if (!getActiveId || getActiveId() === img.id) {
        setSelectedImage(decryptedUrl);
      }
    }
    return true;
  } else {
    console.warn(`Clearing stale local cache for image ${img.id}...`);
    try {
      const { removeImageFromCache } = await import("../../utils/db");
      await removeImageFromCache(img.id);
    } catch (e) {}
    return false;
  }
}
