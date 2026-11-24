import { DecryptedImage } from "../../types";
import { registerImageObjectURL } from "../../utils/fileCrypto";
import { decryptImageCipher, handleDecryptedData } from "./loaders/imageDecryptHelper";

export { handleDecryptedData };

export async function loadImageFromCache(
  img: DecryptedImage, cached: any, activeKey: CryptoKey,
  isPreload: boolean, setSelectedImage: (url: string | null) => void, getActiveId?: () => string | null
): Promise<boolean> {
  const decryptedUrl = await decryptImageCipher(
    cached.ciphertext, cached.iv, cached.contentType || "image/jpeg",
    cached.fileKeyCiphertext, cached.fileKeyIv, cached.fileSalt, activeKey
  );

  if (decryptedUrl) {
    registerImageObjectURL(img.id, decryptedUrl);
    img.originalUrl = decryptedUrl;
    if (!isPreload && (!getActiveId || getActiveId() === img.id)) {
      setSelectedImage(decryptedUrl);
    }
    return true;
  }
  try {
    const { removeImageFromCache } = await import("../../utils/db");
    await removeImageFromCache(img.id);
  } catch {}
  return false;
}
