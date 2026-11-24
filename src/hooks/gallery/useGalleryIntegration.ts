import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useGalleryGlobalState } from "./useGalleryGlobalState";
import { useGalleryMedia } from "./useGalleryMedia";
import { useGallerySelection } from "./useGallerySelection";
import { useGalleryLightbox } from "./useGalleryLightbox";
import { useGalleryKeyboard } from "./useGalleryKeyboard";
import { useGalleryDeletion } from "./useGalleryDeletion";
import { useGalleryProtection } from "./useGalleryProtection";

export function useGalleryIntegration() {
  const auth = useAuth();
  const g = useGalleryGlobalState(auth.showProtected, auth.setShowProtected);
  const m = useGalleryMedia(g.showToast, g.isExtraUnlocked);
  const s = useGallerySelection(m.images, m.setImages, g.showToast);
  const l = useGalleryLightbox({
    images: m.images, selectedImage: m.selectedImage, selectedImageId: m.selectedImageId,
    setSelectedImage: m.setSelectedImage, setSelectedImageId: m.setSelectedImageId, setSelectedImageIsVideo: m.setSelectedImageIsVideo,
    fetchFullMedia: m.fetchFullMedia, securityImageId: auth.securityImageId, extraPassword: auth.extraPassword,
    resetFailedAttempts: auth.resetFailedAttempts, registerFailedAttempt: auth.registerFailedAttempt, lockVault: auth.lockVault,
    isSelectionMode: s.isSelectionMode, handleSelectionClick: s.handleSelectionClick, showToast: g.showToast,
    isExtraUnlocked: g.isExtraUnlocked, setIsExtraUnlocked: g.setIsExtraUnlocked,
  });
  const k = useGalleryKeyboard({
    images: m.images, selectedImage: m.selectedImage, selectedImageId: m.selectedImageId, isUploaderOpen: g.isUploaderOpen,
    isSettingsOpen: g.activeTab === 'settings', isSelectionMode: s.isSelectionMode, selectedForDeletion: s.selectedForDeletion,
    setIsSelectionMode: s.setIsSelectionMode, setSelectedForDeletion: s.setSelectedForDeletion, setIsDeletingMultiple: s.setIsDeletingMultiple,
    handleNextImage: l.handleNextImage, handlePrevImage: l.handlePrevImage, closeLightbox: l.closeLightbox, setIsUploaderOpen: g.setIsUploaderOpen,
  });
  useEffect(() => {
    if (!auth.cryptoKey) g.setIsExtraUnlocked(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("image")) { url.searchParams.delete("image"); window.history.replaceState({}, "", url); }
  }, [auth.cryptoKey]);
  const { handleDelete } = useGalleryDeletion(auth.user, m.images, m.setImages, m.selectedImageId, m.setSelectedImage, m.setSelectedImageId, g.imageToDelete, g.setImageToDelete, g.showToast);
  useGalleryProtection(auth.user, auth.cryptoKey, auth.extraPassword, m.images, m.setImages, g.showToast);
  return { auth, g, m, s, l, k, handleDelete };
}
