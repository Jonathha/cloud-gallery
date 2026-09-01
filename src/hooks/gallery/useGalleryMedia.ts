import { useState, useRef } from 'react';
import { DecryptedImage } from '../../types';
import { useGalleryMediaLoader } from './useGalleryMediaLoader';
import { useGalleryMediaFetcher } from './useGalleryMediaFetcher';

export function useGalleryMedia(
  showToast: (msg: string, type?: 'success' | 'error') => void,
  isExtraUnlocked?: boolean
) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageIsVideo, setSelectedImageIsVideo] = useState(false);
  const [downloadingFull, setDownloadingFull] = useState(false);
  const [fullDownloadProgress, setFullDownloadProgress] = useState('');

  const loader = useGalleryMediaLoader(showToast, isExtraUnlocked);

  const selectedImageIdRef = useRef<string | null>(null);
  selectedImageIdRef.current = selectedImageId;

  const fetcher = useGalleryMediaFetcher({
    isExtraUnlocked,
    setSelectedImage,
    setSelectedImageId,
    setDownloadingFull,
    setFullDownloadProgress,
    showToast,
    getActiveId: () => selectedImageIdRef.current,
  });

  return {
    images: loader.images,
    setImages: loader.setImages,
    loading: loader.loading,
    setLoading: loader.setLoading,
    syncStatus: loader.syncStatus,
    setSyncStatus: loader.setSyncStatus,
    selectedImage,
    setSelectedImage,
    selectedImageId,
    setSelectedImageId,
    selectedImageIsVideo,
    setSelectedImageIsVideo,
    downloadingFull,
    setDownloadingFull,
    fullDownloadProgress,
    setFullDownloadProgress,
    backgroundSyncing: loader.backgroundSyncing,
    backgroundSyncProgress: loader.backgroundSyncProgress,
    loadImages: loader.loadImages,
    fetchFullMedia: fetcher.fetchFullMedia,
    isMigrationNeeded: loader.isMigrationNeeded,
    migrationItems: loader.migrationItems,
    completeMigration: loader.completeMigration,
    showDownloadPrompt: loader.showDownloadPrompt,
    cloudMediaCount: loader.cloudMediaCount,
    onSelectFullDownload: loader.onSelectFullDownload,
    onSelectThumbnailsOnly: loader.onSelectThumbnailsOnly,
  };
}
