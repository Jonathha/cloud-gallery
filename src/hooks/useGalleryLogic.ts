import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useInstallPrompt } from "../utils/useInstallPrompt";
import { useGalleryGlobalState } from "./gallery/useGalleryGlobalState";
import { ToastType } from "../components/Toast";
import { DecryptedImage } from "../types";
import { useGalleryMedia } from "./gallery/useGalleryMedia";
import { useGallerySelection } from "./gallery/useGallerySelection";
import { useGalleryKeyboard } from "./gallery/useGalleryKeyboard";
import { useGalleryProtection } from "./gallery/useGalleryProtection";
import { useGalleryDeletion } from "./gallery/useGalleryDeletion";
import { useGalleryLightbox } from "./gallery/useGalleryLightbox";

export function useGalleryLogic() {
  const {
    user,
    cryptoKey,
    logOut,
    lockVault,
    isAuthReady,
    securityImageId,
    extraPassword,
    showProtected,
    setShowProtected,
    registerFailedAttempt,
    resetFailedAttempts,
  } = useAuth();
  const globalState = useGalleryGlobalState(showProtected, setShowProtected);
  const {
    isInstallable, promptToInstall, isInIframe,
    toast, setToast, showToast,
    imageToDelete, setImageToDelete,
    imageToProtect, setImageToProtect,
    isUploaderOpen, setIsUploaderOpen,
    isUploading, setIsUploading,
    activeTab, setActiveTab,
    settingsSubTab, setSettingsSubTab,
    isExtraUnlocked, setIsExtraUnlocked
  } = globalState;

  const m = useGalleryMedia(showToast, isExtraUnlocked);
  const s = useGallerySelection(m.images, m.setImages, showToast);

  const l = useGalleryLightbox({
    images: m.images,
    selectedImage: m.selectedImage,
    selectedImageId: m.selectedImageId,
    setSelectedImage: m.setSelectedImage,
    setSelectedImageId: m.setSelectedImageId,
    setSelectedImageIsVideo: m.setSelectedImageIsVideo,
    fetchFullMedia: m.fetchFullMedia,
    securityImageId,
    extraPassword,
    resetFailedAttempts,
    registerFailedAttempt,
    lockVault,
    isSelectionMode: s.isSelectionMode,
    handleSelectionClick: s.handleSelectionClick,
    showToast,
    isExtraUnlocked,
    setIsExtraUnlocked,
  });

  const k = useGalleryKeyboard({
    images: m.images,
    selectedImage: m.selectedImage,
    selectedImageId: m.selectedImageId,
    isUploaderOpen,
    isSettingsOpen: activeTab === 'settings',
    isSelectionMode: s.isSelectionMode,
    selectedForDeletion: s.selectedForDeletion,
    setIsSelectionMode: s.setIsSelectionMode,
    setSelectedForDeletion: s.setSelectedForDeletion,
    setIsDeletingMultiple: s.setIsDeletingMultiple,
    handleNextImage: l.handleNextImage,
    handlePrevImage: l.handlePrevImage,
    closeLightbox: l.closeLightbox,
    setIsUploaderOpen,
  });


  useEffect(() => {
    if (!cryptoKey) {
      setIsExtraUnlocked(false);
    }
    const url = new URL(window.location.href);
    if (url.searchParams.has("image")) {
      url.searchParams.delete("image");
      window.history.replaceState({}, "", url);
    }
  }, [cryptoKey]);

  const { handleDelete } = useGalleryDeletion(
    user,
    m.images,
    m.setImages,
    m.selectedImageId,
    m.setSelectedImage,
    m.setSelectedImageId,
    imageToDelete,
    setImageToDelete,
    showToast,
  );

  useGalleryProtection(
    user,
    cryptoKey,
    extraPassword,
    m.images,
    m.setImages,
    showToast,
  );

  return {
    user, cryptoKey, logOut, lockVault, securityImageId, extraPassword, isInstallable, promptToInstall, isInIframe, showProtected, setShowProtected,
    images: m.images, loading: m.loading, syncStatus: m.syncStatus, selectedImage: m.selectedImage, selectedImageId: m.selectedImageId, selectedImageIsVideo: m.selectedImageIsVideo,
    downloadingFull: m.downloadingFull, fullDownloadProgress: m.fullDownloadProgress, backgroundSyncing: m.backgroundSyncing, backgroundSyncProgress: m.backgroundSyncProgress,
    imageFit: l.imageFit, imageToDelete, imageToProtect, isUploaderOpen, isUploading, activeTab, settingsSubTab, isSelectionMode: s.isSelectionMode, selectedForDeletion: s.selectedForDeletion,
    isDeletingMultiple: s.isDeletingMultiple, isCleaningDuplicates: s.isCleaningDuplicates, isDraggingGlobal: k.isDraggingGlobal, droppedFiles: k.droppedFiles, duplicatesToDelete: s.duplicatesToDelete,
    toast, showControls: l.showControls, isFullscreen: l.isFullscreen, isZoomed: l.isZoomed, isShareOpen: l.isShareOpen, extraPasswordInput: l.extraPasswordInput, isPromptingExtra: l.isPromptingExtra, isExtraUnlocked,
    setSelectedImage: m.setSelectedImage, setSelectedImageId: m.setSelectedImageId, setSelectedImageIsVideo: m.setSelectedImageIsVideo, setImageFit: l.setImageFit, setImageToDelete, setImageToProtect, setIsUploaderOpen, setIsUploading, setActiveTab, setSettingsSubTab,
    setIsSelectionMode: s.setIsSelectionMode, setSelectedForDeletion: s.setSelectedForDeletion, setIsDeletingMultiple: s.setIsDeletingMultiple, setIsCleaningDuplicates: s.setIsCleaningDuplicates,
    setIsDraggingGlobal: k.setIsDraggingGlobal, setDroppedFiles: k.setDroppedFiles, setDuplicatesToDelete: s.setDuplicatesToDelete, setToast, setShowControls: l.setShowControls,
    setIsZoomed: l.setIsZoomed, setIsShareOpen: l.setIsShareOpen, setExtraPasswordInput: l.setExtraPasswordInput, setIsPromptingExtra: l.setIsPromptingExtra, setIsExtraUnlocked,
    showToast, loadImages: m.loadImages, handleNextImage: l.handleNextImage, handlePrevImage: l.handlePrevImage, isMigrationNeeded: m.isMigrationNeeded, migrationItems: m.migrationItems, completeMigration: m.completeMigration,
    showDownloadPrompt: m.showDownloadPrompt, cloudMediaCount: m.cloudMediaCount, onSelectFullDownload: m.onSelectFullDownload, onSelectThumbnailsOnly: m.onSelectThumbnailsOnly,
    handleDelete, handleDeleteMultiple: s.handleDeleteMultiple, handleCleanDuplicates: s.handleCleanDuplicates, handleImageClick: l.handleImageClick, handleExtraPasswordSubmit: l.handleExtraPasswordSubmit,
    fetchFullMedia: m.fetchFullMedia, closeLightbox: l.closeLightbox, toggleFullscreen: l.toggleFullscreen,
  };
}
