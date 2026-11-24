import { DecryptedImage } from "../../types";
import { registerVideoObjectURL } from "../../utils/fileCrypto";
import { extractVideoKeys, decryptVideoBuffer } from "./loaders/videoDecryptHelper";

export async function loadVideoFromCache(
  img: DecryptedImage, cached: any, activeKey: CryptoKey, isPreload: boolean,
  setSelectedImage: (url: string | null) => void, setFullDownloadProgress: (p: string) => void, getActiveId?: () => string | null
): Promise<boolean> {
  if (!isPreload) setFullDownloadProgress("Descriptografando vídeo local...");
  try {
    const { fileKeyStr, isEnvelope, rawMasterKey } = await extractVideoKeys(cached.fileKeyCiphertext, cached.fileKeyIv, cached.fileSalt, activeKey);
    const isBinary = cached.ciphertext instanceof Uint8Array || cached.ciphertext instanceof ArrayBuffer;
    const decryptedBuffer = await decryptVideoBuffer({
      ciphertextBytes: isBinary ? cached.ciphertext : undefined,
      ciphertextBase64: !isBinary ? cached.ciphertext : undefined,
      fileSalt: cached.fileSalt, fileKeyStr, iv: cached.iv, isEnvelope, rawMasterKey
    });
    const blob = new Blob([decryptedBuffer], { type: cached.contentType || 'video/mp4' });
    const objectUrl = URL.createObjectURL(blob);
    registerVideoObjectURL(img.id, objectUrl);
    img.originalUrl = objectUrl;
    if (!isPreload && (!getActiveId || getActiveId() === img.id)) setSelectedImage(objectUrl);
    return true;
  } catch { return false; }
}
