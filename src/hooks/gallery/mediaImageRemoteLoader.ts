import { DecryptedImage } from "../../types";
import { registerImageObjectURL, fetchAndUnpackImage } from "../../utils/fileCrypto";
import { decryptImageCipher } from "./loaders/imageDecryptHelper";
import { persistLoadedImage } from "./loaders/imagePersistHelper";
import { activeSyncDownloads } from "./useGalleryMediaLoader/sync/syncState";
import { getImageFromCache } from "../../utils/db";
import { loadImageFromCache } from "./mediaImageCacheLoader";

export async function loadImageFromRemote(
  img: DecryptedImage, token: string | undefined, activeKey: CryptoKey,
  cachedThumb: any, isPreload: boolean, setSelectedImage: (url: string | null) => void, getActiveId?: () => string | null,
  userId?: string
): Promise<void> {
  if (activeSyncDownloads.has(img.id)) {
    try { await activeSyncDownloads.get(img.id); } catch {}
    const cached = await getImageFromCache(img.id);
    if (cached?.ciphertext && cached.ciphertext !== "chunked_vault_data") {
      const loaded = await loadImageFromCache(img, cached, activeKey, isPreload, setSelectedImage, getActiveId);
      if (loaded) return;
    }
  }

  const downloadPromise = (async () => {
    const fileData = await fetchAndUnpackImage(img.id, token);
    if (fileData.ciphertext === "chunked_vault_data") throw new Error("Formato particionado antigo não suportado.");
    if (!activeKey) throw new Error("Chave de criptografia não disponível.");

    const decryptedUrl = await decryptImageCipher(
      fileData.ciphertext, fileData.iv, fileData.contentType || "image/jpeg",
      fileData.fileKeyCiphertext, fileData.fileKeyIv, fileData.fileSalt, activeKey
    );
    if (!decryptedUrl) throw new Error("Não foi possível descriptografar a mídia do cofre.");

    registerImageObjectURL(img.id, decryptedUrl);
    img.originalUrl = decryptedUrl;
    if (!isPreload && (!getActiveId || getActiveId() === img.id)) {
      setSelectedImage(decryptedUrl);
    }
    await persistLoadedImage(img, fileData, cachedThumb, userId || img.userId);
  })();

  activeSyncDownloads.set(img.id, downloadPromise);
  try {
    await downloadPromise;
  } finally {
    activeSyncDownloads.delete(img.id);
  }
}
