import { useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { DecryptedImage } from "../../types";
import { getImageFromCache } from "../../utils/db";
import { checkExistingObjectURL } from "./mediaCache";
import { resolveSecurityKey } from "./mediaSecurity";
import { loadVideoFromCache } from "./mediaVideoCacheLoader";
import { loadVideoFromRemote } from "./mediaVideoRemoteLoader";
import { loadImageFromCache } from "./mediaImageCacheLoader";
import { loadImageFromRemote } from "./mediaImageRemoteLoader";
import { getVideoObjectURL, getImageObjectURL } from "../../utils/fileCrypto";

interface UseGalleryMediaFetcherProps {
  isExtraUnlocked?: boolean;
  setSelectedImage: (url: string | null) => void;
  setSelectedImageId: (id: string | null) => void;
  setDownloadingFull: (val: boolean) => void;
  setFullDownloadProgress: (progress: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  getActiveId?: () => string | null;
}

export function useGalleryMediaFetcher({
  isExtraUnlocked,
  setSelectedImage,
  setSelectedImageId,
  setDownloadingFull,
  setFullDownloadProgress,
  showToast,
  getActiveId,
}: UseGalleryMediaFetcherProps) {
  const { user, cryptoKey, extraPassword, securityImageId } = useAuth();
  const inFlightRequestsRef = useRef<Map<string, Promise<void>>>(new Map());

  const fetchFullMedia = async (img: DecryptedImage, isPreload = false) => {
    const isVideo = img.isVideo || img.contentType?.startsWith("video/") || false;
    
    if (checkExistingObjectURL(img, isVideo, isPreload, setSelectedImage)) {
      return;
    }

    // Se já houver uma operação em andamento para esta mídia, aguarda a mesma Promise
    const inFlightPromise = inFlightRequestsRef.current.get(img.id);
    if (inFlightPromise) {
      if (!isPreload) {
        setSelectedImage(img.url || null);
        setDownloadingFull(true);
      }
      try {
        await inFlightPromise;
        const objectUrl = isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id);
        const resolvedUrl = objectUrl || img.originalUrl;
        if (resolvedUrl && !isPreload && (!getActiveId || getActiveId() === img.id)) {
          setSelectedImage(resolvedUrl);
        }
      } catch (err: any) {
        if (!isPreload && (!getActiveId || getActiveId() === img.id)) {
          if (img.url) {
            setSelectedImage(img.url);
          } else {
            showToast(err.message || "Erro ao carregar ou descriptografar mídia completa.", "error");
            setSelectedImage(null);
            setSelectedImageId(null);
          }
        }
      } finally {
        if (!isPreload && (!getActiveId || getActiveId() === img.id)) {
          setDownloadingFull(false);
          setFullDownloadProgress("");
        }
      }
      return;
    }

    if (!isPreload) setSelectedImage(img.url || null);

    const performFetch = async () => {
      const activeKey = await resolveSecurityKey(
        img.id, cryptoKey!, securityImageId, isExtraUnlocked, extraPassword
      );

      if (!isPreload) setDownloadingFull(true);
      
      let decryptedFromCache = false;
      const cached = await getImageFromCache(img.id);

      if (cached && cached.ciphertext && cached.ciphertext !== "chunked_vault_data") {
        if (isVideo) {
          decryptedFromCache = await loadVideoFromCache(
            img, cached, activeKey, isPreload, setSelectedImage, setFullDownloadProgress, getActiveId
          );
        } else {
          decryptedFromCache = await loadImageFromCache(
            img, cached, activeKey, isPreload, setSelectedImage, getActiveId
          );
        }
      }

      if (!decryptedFromCache && user) {
        if (!isPreload) setFullDownloadProgress("Carregando do cofre seguro...");
        try {
          const token = await user.getIdToken(false).catch(() => undefined);
          if (isVideo) {
            await loadVideoFromRemote(
              img, token, activeKey, cached, isPreload, setSelectedImage, setFullDownloadProgress, getActiveId
            );
          } else {
            await loadImageFromRemote(
              img, token, activeKey, cached, isPreload, setSelectedImage, getActiveId
            );
          }
        } catch (fetchErr: any) {
          throw new Error(fetchErr.message || "Erro ao baixar ou descriptografar mídia do cofre.");
        }
      }
    };

    const taskPromise = performFetch();
    inFlightRequestsRef.current.set(img.id, taskPromise);

    try {
      await taskPromise;
    } catch (err: any) {
      console.error("Error loading full asset", err);
      if (!isPreload && (!getActiveId || getActiveId() === img.id)) {
        if (img.url) {
          setSelectedImage(img.url);
        } else {
          showToast(err.message || "Erro ao carregar ou descriptografar mídia completa.", "error");
          setSelectedImage(null);
          setSelectedImageId(null);
        }
      }
    } finally {
      inFlightRequestsRef.current.delete(img.id);
      if (!isPreload && (!getActiveId || getActiveId() === img.id)) {
        setDownloadingFull(false);
        setFullDownloadProgress("");
      }
    }
  };

  return { fetchFullMedia };
}
