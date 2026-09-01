import { DecryptedImage } from "../../types";
import { bytesToBase64 } from "../../utils/crypto";
import { 
  decryptFileKey, 
  decryptVideoWithWorker, 
  registerVideoObjectURL
} from "../../utils/fileCrypto";

export async function loadVideoFromCache(
  img: DecryptedImage,
  cached: any,
  activeKey: CryptoKey,
  isPreload: boolean,
  setSelectedImage: (url: string | null) => void,
  setFullDownloadProgress: (progress: string) => void,
  getActiveId?: () => string | null
): Promise<boolean> {
  if (!isPreload) {
    setFullDownloadProgress("Descriptografando vídeo local...");
  }
  try {
    let fileKeyStr = "";
    let isEnvelope = false;
    if (cached.fileKeyCiphertext && cached.fileKeyIv && cached.fileSalt && activeKey) {
      fileKeyStr = await decryptFileKey(cached.fileKeyCiphertext, cached.fileKeyIv, activeKey);
      isEnvelope = true;
    }
    
    let rawMasterKey = "";
    if (!isEnvelope && activeKey) {
      const rawKey = await window.crypto.subtle.exportKey('raw', activeKey);
      rawMasterKey = await bytesToBase64(new Uint8Array(rawKey));
    }
    
    const isBinary = cached.ciphertext instanceof Uint8Array || cached.ciphertext instanceof ArrayBuffer;

    const { decryptedBuffer } = await decryptVideoWithWorker({
      ciphertextBytes: isBinary ? (cached.ciphertext as any) : undefined,
      ciphertextBase64: !isBinary ? (cached.ciphertext as string) : undefined,
      fileSalt: cached.fileSalt,
      fileKeyStr,
      iv: cached.iv,
      isEnvelope,
      rawMasterKey
    });
    
    const blob = new Blob([decryptedBuffer], { type: cached.contentType || 'video/mp4' });
    const objectUrl = URL.createObjectURL(blob);
    registerVideoObjectURL(img.id, objectUrl);
    
    img.originalUrl = objectUrl;
    if (!isPreload) {
      if (!getActiveId || getActiveId() === img.id) {
        setSelectedImage(objectUrl);
      }
    }
    return true;
  } catch (e) {
    console.warn("Local video decryption with worker failed, will try direct fetch fallback...", e);
    return false;
  }
}
