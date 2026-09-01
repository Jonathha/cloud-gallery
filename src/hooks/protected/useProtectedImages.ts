import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getAuxKeyFromCache, saveAuxKeyToCache } from "../../utils/db";
import { doc, getDoc } from "firebase/firestore";
import { dbPrimary } from "../../firebase";
import { deriveKey, decryptData } from "../../utils/crypto";
import { fetchAndUnpackImage } from "../../utils/fileCrypto";
import { getApiUrl } from "../../utils/apiUrl";

export function useProtectedImages(isUnlocked: boolean) {
  const { user, extraPassword, cryptoKey } = useAuth();
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingFull, setDownloadingFull] = useState(false);
  const [fullDownloadProgress, setFullDownloadProgress] = useState("");

  const decryptedThumbnailsCache = useRef<Map<string, string>>(new Map());
  const decryptedFullCache = useRef<Map<string, string>>(new Map());

  const loadProtectedImages = async () => {
    if (!user || !extraPassword || !cryptoKey || !isUnlocked) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        getApiUrl(`/api/storage/protected-images?userId=${user?.uid}`),
      );
      const data = await res.json();
      if (data.success) {
        const decryptedImages = await Promise.all(
          data.images.map(async (img: any) => {
            try {
              if (decryptedThumbnailsCache.current.has(img.id)) {
                return {
                  ...img,
                  url: decryptedThumbnailsCache.current.get(img.id)!,
                  failed: false,
                  noThumbnail: !img.thumbnailCiphertext,
                  isVideo: img.contentType?.startsWith("video/"),
                };
              }

              let auxKey: string | undefined = undefined;

              try {
                auxKey = await getAuxKeyFromCache(img.id);
              } catch (err) {
                console.warn(`Failed to read cached aux key for ${img.id}:`, err);
              }

              if (!auxKey && navigator.onLine) {
                try {
                  const keyDoc = await getDoc(
                    doc(dbPrimary, "media_keys", img.id),
                  );
                  if (keyDoc.exists()) {
                    auxKey = keyDoc.data().auxKey;
                    if (auxKey) {
                      await saveAuxKeyToCache(img.id, auxKey);
                    }
                  }
                } catch (err) {
                  console.warn(
                    `Failed to fetch aux key from Firestore for ${img.id}:`,
                    err,
                  );
                }
              }

              if (!auxKey) {
                console.warn(`No aux key available for ${img.id}`);
                return {
                  ...img,
                  url: "",
                  failed: true,
                  noThumbnail: true,
                  isVideo: img.contentType?.startsWith("video/"),
                };
              }

              const salt = btoa(auxKey.slice(0, 16).padEnd(16, "0"));
              const combinedKey = await deriveKey(extraPassword!, salt);

              let decryptedUrl = "";
              let failed = false;

              let fileKeyStr: string | null = null;
              if (img.fileKeyCiphertext && img.fileKeyIv && img.fileSalt) {
                try {
                  const { decryptFileKey } = await import("../../utils/fileCrypto");
                  fileKeyStr = await decryptFileKey(
                    img.fileKeyCiphertext,
                    img.fileKeyIv,
                    combinedKey,
                  );
                } catch (e) {
                  console.error("Failed to decrypt file key for thumbnail", e);
                }
              }

              if (img.thumbnailCiphertext && img.thumbnailIv) {
                try {
                  if (fileKeyStr && img.fileSalt) {
                    try {
                      const { decryptWithFileKey } = await import("../../utils/fileCrypto");
                      decryptedUrl = await decryptWithFileKey(
                        img.thumbnailCiphertext,
                        img.thumbnailIv,
                        fileKeyStr,
                        img.fileSalt
                      );
                    } catch (innerErr) {
                      console.warn("Envelope decryption failed for thumbnail, trying legacy combinedKey decryption as fallback...", innerErr);
                      decryptedUrl = await decryptData(
                        img.thumbnailCiphertext,
                        img.thumbnailIv,
                        combinedKey
                      );
                    }
                  } else {
                    decryptedUrl = await decryptData(
                      img.thumbnailCiphertext,
                      img.thumbnailIv,
                      combinedKey
                    );
                  }
                  decryptedThumbnailsCache.current.set(img.id, decryptedUrl);
                } catch (thErr) {
                  console.warn("Failed decrypting thumbnail", thErr);
                  failed = true;
                }
              }

              return {
                ...img,
                url: decryptedUrl,
                failed,
                noThumbnail: !img.thumbnailCiphertext,
                isVideo: img.contentType?.startsWith("video/"),
              };
            } catch (err) {
              console.error("Error processing protected image metadata:", err);
              return {
                ...img,
                url: "",
                failed: true,
                noThumbnail: true,
                isVideo: img.contentType?.startsWith("video/"),
              };
            }
          })
        );
        setImages(decryptedImages.filter(Boolean));
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar imagens protegidas");
    } finally {
      setLoading(false);
    }
  };

  const fetchFullResolution = async (img: any) => {
    try {
      setDownloadingFull(true);
      

      let auxKey = await getAuxKeyFromCache(img.id);
      if (!auxKey && navigator.onLine) {
        const keyDoc = await getDoc(doc(dbPrimary, "media_keys", img.id));
        if (keyDoc.exists()) {
          auxKey = keyDoc.data().auxKey;
          if (auxKey) {
            await saveAuxKeyToCache(img.id, auxKey);
          }
        }
      }

      if (!auxKey) {
        throw new Error("Chave de segurança não disponível para esta imagem.");
      }

      const salt = btoa(auxKey.slice(0, 16).padEnd(16, "0"));
      const combinedKey = await deriveKey(extraPassword!, salt);

      const token = user ? await user.getIdToken() : undefined;
      const fileData = await fetchAndUnpackImage(img.id, token);
      if (!fileData) {
        throw new Error("Mídia não encontrada no cofre.");
      }
      

      let decryptedUrl = "";
      if (fileData.fileKeyCiphertext && fileData.fileKeyIv) {
        const { decryptFileKey, decryptWithFileKey } = await import("../../utils/fileCrypto");
        const fileKeyStr = await decryptFileKey(
          fileData.fileKeyCiphertext,
          fileData.fileKeyIv,
          combinedKey
        );
        decryptedUrl = await decryptWithFileKey(
          fileData.ciphertext,
          fileData.iv,
          fileKeyStr,
          fileData.fileSalt || img.fileSalt || ""
        );
      } else {
        decryptedUrl = await decryptData(
          fileData.ciphertext,
          fileData.iv,
          combinedKey
        );
      }

      if (!decryptedUrl.startsWith('data:') && !decryptedUrl.startsWith('blob:')) {
        decryptedUrl = `data:${fileData.contentType || "image/jpeg"};base64,${decryptedUrl}`;
      }

      decryptedFullCache.current.set(img.id, decryptedUrl);

      setImages((prev) =>
        prev.map((item) =>
          item.id === img.id ? { ...item, originalUrl: decryptedUrl } : item
        )
      );
    } catch (err: any) {
      console.error("Error loading full resolution:", err);
    } finally {
      setDownloadingFull(false);
      setFullDownloadProgress("");
    }
  };

  useEffect(() => {
    if (!user || !extraPassword || !cryptoKey || !isUnlocked) return;
    loadProtectedImages();

    const handleRefresh = () => {
      loadProtectedImages();
    };

    window.addEventListener("refresh-protected-gallery", handleRefresh);
    return () =>
      window.removeEventListener("refresh-protected-gallery", handleRefresh);
  }, [user, extraPassword, cryptoKey, isUnlocked]);

  return {
    images,
    setImages,
    loading,
    error,
    downloadingFull,
    fullDownloadProgress,
    loadProtectedImages,
    fetchFullResolution,
    decryptedFullCache,
  };
}
