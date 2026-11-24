import { DecryptedImage } from "../../types";
import { registerVideoObjectURL, fetchRawEncryptedFile, unpackEncryptedFileRaw } from "../../utils/fileCrypto";
import { extractVideoKeys, decryptVideoBuffer } from "./loaders/videoDecryptHelper";
import { persistLoadedVideo } from "./loaders/videoPersistHelper";
import { activeSyncDownloads } from "./useGalleryMediaLoader/sync/syncState";
import { getImageFromCache } from "../../utils/db";
import { loadVideoFromCache } from "./mediaVideoCacheLoader";

export async function loadVideoFromRemote(
  img: DecryptedImage, token: string | undefined, activeKey: CryptoKey, cachedThumbnail: any,
  isPreload: boolean, setSelectedImage: (url: string | null) => void, setFullDownloadProgress: (p: string) => void,
  getActiveId?: () => string | null, userId?: string
): Promise<void> {
  if (activeSyncDownloads.has(img.id)) {
    try { await activeSyncDownloads.get(img.id); } catch {}
    const cached = await getImageFromCache(img.id);
    if (cached?.ciphertext && cached.ciphertext !== "chunked_vault_data") {
      const loaded = await loadVideoFromCache(img, cached, activeKey, isPreload, setSelectedImage, setFullDownloadProgress, getActiveId);
      if (loaded) return;
    }
  }

  const downloadPromise = (async () => {
    if (!isPreload) setFullDownloadProgress("Baixando vídeo criptografado...");
    const buffer = await fetchRawEncryptedFile(img.id, token);
    if (!isPreload) setFullDownloadProgress("Descriptografando vídeo...");
    const { metadata, ciphertextBytes } = unpackEncryptedFileRaw(buffer);
    if (metadata.ciphertext === "chunked_vault_data") throw new Error("Formato antigo não suportado.");
    if (!activeKey) throw new Error("Chave de criptografia não disponível.");

    const { fileKeyStr, isEnvelope, rawMasterKey } = await extractVideoKeys(metadata.fileKeyCiphertext, metadata.fileKeyIv, metadata.fileSalt, activeKey);
    const decryptedBuffer = await decryptVideoBuffer({
      buffer: ciphertextBytes.buffer as ArrayBuffer, fileSalt: metadata.fileSalt, fileKeyStr,
      iv: metadata.iv || (img as any).iv || "", isEnvelope, rawMasterKey
    });
    const blob = new Blob([decryptedBuffer], { type: metadata.contentType || "video/mp4" });
    const objectUrl = URL.createObjectURL(blob);
    registerVideoObjectURL(img.id, objectUrl);
    img.originalUrl = objectUrl;
    if (!isPreload && (!getActiveId || getActiveId() === img.id)) setSelectedImage(objectUrl);
    await persistLoadedVideo(img, metadata, ciphertextBytes.slice(), cachedThumbnail, userId || img.userId);
  })();

  activeSyncDownloads.set(img.id, downloadPromise);
  try {
    await downloadPromise;
  } finally {
    activeSyncDownloads.delete(img.id);
  }
}
