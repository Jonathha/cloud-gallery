import { useGalleryIntegration } from "./gallery/useGalleryIntegration";

export function useGalleryLogic() {
  const { auth, g, m, s, l, k, handleDelete } = useGalleryIntegration();
  return {
    user: auth.user, cryptoKey: auth.cryptoKey, logOut: auth.logOut, lockVault: auth.lockVault,
    securityImageId: auth.securityImageId, extraPassword: auth.extraPassword, isInstallable: g.isInstallable,
    promptToInstall: g.promptToInstall, isInIframe: g.isInIframe, showProtected: auth.showProtected,
    setShowProtected: auth.setShowProtected, images: m.images, loading: m.loading, syncStatus: m.syncStatus,
    selectedImage: m.selectedImage, selectedImageId: m.selectedImageId, selectedImageIsVideo: m.selectedImageIsVideo,
    downloadingFull: m.downloadingFull, fullDownloadProgress: m.fullDownloadProgress,
    backgroundSyncing: m.backgroundSyncing, backgroundSyncProgress: m.backgroundSyncProgress,
    imageFit: l.imageFit, imageToDelete: g.imageToDelete, imageToProtect: g.imageToProtect,
    isUploaderOpen: g.isUploaderOpen, isUploading: g.isUploading, activeTab: g.activeTab,
    settingsSubTab: g.settingsSubTab, isSelectionMode: s.isSelectionMode, selectedForDeletion: s.selectedForDeletion,
    isDeletingMultiple: s.isDeletingMultiple, isCleaningDuplicates: s.isCleaningDuplicates,
    isDraggingGlobal: k.isDraggingGlobal, droppedFiles: k.droppedFiles, duplicatesToDelete: s.duplicatesToDelete,
    toast: g.toast, showControls: l.showControls, isFullscreen: l.isFullscreen, isZoomed: l.isZoomed,
    isShareOpen: l.isShareOpen, extraPasswordInput: l.extraPasswordInput, isPromptingExtra: l.isPromptingExtra,
    isExtraUnlocked: g.isExtraUnlocked, setSelectedImage: m.setSelectedImage, setSelectedImageId: m.setSelectedImageId,
    setSelectedImageIsVideo: m.setSelectedImageIsVideo, setImageFit: l.setImageFit, setImageToDelete: g.setImageToDelete,
    setImageToProtect: g.setImageToProtect, setIsUploaderOpen: g.setIsUploaderOpen, setIsUploading: g.setIsUploading,
    setActiveTab: g.setActiveTab, setSettingsSubTab: g.setSettingsSubTab, setIsSelectionMode: s.setIsSelectionMode,
    setSelectedForDeletion: s.setSelectedForDeletion, setIsDeletingMultiple: s.setIsDeletingMultiple,
    setIsCleaningDuplicates: s.setIsCleaningDuplicates, setIsDraggingGlobal: k.setIsDraggingGlobal,
    setDroppedFiles: k.setDroppedFiles, setDuplicatesToDelete: s.setDuplicatesToDelete, setToast: g.setToast,
    setShowControls: l.setShowControls, setIsZoomed: l.setIsZoomed, setIsShareOpen: l.setIsShareOpen,
    setExtraPasswordInput: l.setExtraPasswordInput, setIsPromptingExtra: l.setIsPromptingExtra,
    setIsExtraUnlocked: g.setIsExtraUnlocked, showToast: g.showToast, loadImages: m.loadImages,
    handleNextImage: l.handleNextImage, handlePrevImage: l.handlePrevImage, isMigrationNeeded: m.isMigrationNeeded,
    migrationItems: m.migrationItems, completeMigration: m.completeMigration, showDownloadPrompt: m.showDownloadPrompt,
    cloudMediaCount: m.cloudMediaCount, onSelectFullDownload: m.onSelectFullDownload,
    onSelectThumbnailsOnly: m.onSelectThumbnailsOnly, handleDelete, handleDeleteMultiple: s.handleDeleteMultiple,
    handleCleanDuplicates: s.handleCleanDuplicates, handleImageClick: l.handleImageClick,
    handleExtraPasswordSubmit: l.handleExtraPasswordSubmit, fetchFullMedia: m.fetchFullMedia,
    closeLightbox: l.closeLightbox, toggleFullscreen: l.toggleFullscreen,
  };
}
