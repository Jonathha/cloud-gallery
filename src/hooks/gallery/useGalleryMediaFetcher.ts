import { useRef, useCallback, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { DecryptedImage } from "../../types";
import { checkExistingObjectURL } from "./mediaCache";
import { UseGalleryMediaFetcherProps } from "./fetcher/types";
import { performMediaFetch } from "./fetcher/performMediaFetch";
import { handleInFlight } from "./fetcher/inFlightHandler";
import { mediaScheduler } from "../../utils/mediaScheduler";

export function useGalleryMediaFetcher({
  isExtraUnlocked, setSelectedImage, setSelectedImageId, setDownloadingFull,
  setFullDownloadProgress, showToast, getActiveId,
}: UseGalleryMediaFetcherProps) {
  const { user, cryptoKey, extraPassword, securityImageId } = useAuth();
  const inFlightRequestsRef = useRef<Map<string, Promise<void>>>(new Map());

  const latestRef = useRef({
    isExtraUnlocked, setSelectedImage, setSelectedImageId, setDownloadingFull,
    setFullDownloadProgress, showToast, getActiveId,
    user, cryptoKey, extraPassword, securityImageId
  });

  useEffect(() => {
    latestRef.current = {
      isExtraUnlocked, setSelectedImage, setSelectedImageId, setDownloadingFull,
      setFullDownloadProgress, showToast, getActiveId,
      user, cryptoKey, extraPassword, securityImageId
    };
  });

  const fetchFullMedia = useCallback(async (img: DecryptedImage, isPreload = false, priority?: number) => {
    const {
      isExtraUnlocked, setSelectedImage, setSelectedImageId, setDownloadingFull,
      setFullDownloadProgress, showToast, getActiveId,
      user, cryptoKey, extraPassword, securityImageId
    } = latestRef.current;

    const isVideo = img.isVideo || img.contentType?.startsWith("video/") || false;
    if (checkExistingObjectURL(img, isVideo, isPreload, setSelectedImage)) return;
    
    const resolvedPriority = priority !== undefined ? priority : (isPreload ? 1 : 3);
    const inFlight = inFlightRequestsRef.current.get(img.id);
    if (inFlight) {
      mediaScheduler.enqueue(img.id, resolvedPriority, () =>
        performMediaFetch({ img, isVideo, isPreload, cryptoKey, securityImageId, isExtraUnlocked, extraPassword, user, setSelectedImage, setDownloadingFull, setFullDownloadProgress, getActiveId })
      );
      return handleInFlight(inFlight, img, isVideo, isPreload, setSelectedImage, setSelectedImageId, setDownloadingFull, setFullDownloadProgress, showToast, getActiveId);
    }
    if (!isPreload) setSelectedImage(img.url || null);
    
    const task = mediaScheduler.enqueue(img.id, resolvedPriority, () =>
      performMediaFetch({ img, isVideo, isPreload, cryptoKey, securityImageId, isExtraUnlocked, extraPassword, user, setSelectedImage, setDownloadingFull, setFullDownloadProgress, getActiveId })
    );
    
    inFlightRequestsRef.current.set(img.id, task);
    try { await task; } catch (err: any) {
      const is404Missing = err && typeof err.message === 'string' && (err.message.includes('404') || err.message.includes('não encontrada'));
      if (is404Missing) {
        img.isMissing = true;
      }
      if (!isPreload && (!getActiveId || getActiveId() === img.id)) {
        if (img.url && !is404Missing) setSelectedImage(img.url);
        else {
          if (!is404Missing) {
            showToast(err.message || "Erro ao carregar mídia.", "error");
          }
          setSelectedImage(null);
          setSelectedImageId(null);
        }
      }
    } finally {
      inFlightRequestsRef.current.delete(img.id);
      if (!isPreload && (!getActiveId || getActiveId() === img.id)) { setDownloadingFull(false); setFullDownloadProgress(""); }
    }
  }, []);

  return { fetchFullMedia };
}
