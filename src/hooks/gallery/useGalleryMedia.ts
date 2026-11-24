import { useRef } from 'react';
import { useGalleryMediaLoader } from './useGalleryMediaLoader';
import { useGalleryMediaFetcher } from './useGalleryMediaFetcher';
import { useSelectedMediaState } from './media/useSelectedMediaState';

export function useGalleryMedia(showToast: (msg: string, type?: 'success' | 'error') => void, isExtraUnlocked?: boolean) {
  const mediaState = useSelectedMediaState();
  const loader = useGalleryMediaLoader(showToast, isExtraUnlocked);
  const selectedImageIdRef = useRef<string | null>(null);
  selectedImageIdRef.current = mediaState.selectedImageId;

  const fetcher = useGalleryMediaFetcher({
    isExtraUnlocked, setSelectedImage: mediaState.setSelectedImage,
    setSelectedImageId: mediaState.setSelectedImageId, setDownloadingFull: mediaState.setDownloadingFull,
    setFullDownloadProgress: mediaState.setFullDownloadProgress, showToast, getActiveId: () => selectedImageIdRef.current,
  });

  return { ...loader, ...mediaState, fetchFullMedia: fetcher.fetchFullMedia };
}
