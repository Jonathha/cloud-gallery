import React from "react";
import ShareModal from "./ShareModal";
import Toast from "./Toast";
import GallerySidebar from "./GallerySidebar";
import Lightbox from "./Lightbox";
import ExtraPasswordPrompt from "./ExtraPasswordPrompt";
import GalleryHeader from "./GalleryHeader";
import SelectionBottomBar from "./SelectionBottomBar";
import { AnimatePresence, motion } from "motion/react";
import { useGalleryLogic } from "../hooks/useGalleryLogic";
import { useAuth } from "../contexts/AuthContext";

import DragOverlay from "./DragOverlay";
import MobileBottomNav from "./MobileBottomNav";
import ProtectImageModal from "./ProtectImageModal";
import GalleryUploaderModal from "./gallery/GalleryUploaderModal";
import GalleryActiveTabContent from "./gallery/GalleryActiveTabContent";
import GalleryConfirmModals from "./gallery/GalleryConfirmModals";
import GalleryFloatingAddButton from "./gallery/GalleryFloatingAddButton";
import { authPrimary } from "../firebase";
import { KeyRound } from "lucide-react";
import MigrationOverlay from "./gallery/MigrationOverlay";
import DownloadPreferenceModal from "./gallery/DownloadPreferenceModal";

export default function Gallery() {
  const { cryptoKey } = useAuth();
  const g = useGalleryLogic();
  
  const [isProtectedLightboxOpen, setIsProtectedLightboxOpen] = React.useState(false);

  const [dismissedBanner, setDismissedBanner] = React.useState(() => {
    return localStorage.getItem("dismiss_email_pass_banner_v1") === "true";
  });

  const activeUser = authPrimary.currentUser;
  const isEmailProvider =
    activeUser?.providerData?.some((p: any) => p.providerId === "password") ||
    (!activeUser?.providerData && activeUser?.email);

  const handleDismissBanner = () => {
    localStorage.setItem("dismiss_email_pass_banner_v1", "true");
    setDismissedBanner(true);
  };

  React.useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const tab = customEvent.detail;
      if (tab.startsWith('settings-')) {
        g.setSettingsSubTab(tab.split('settings-')[1] as any);
        g.setActiveTab('settings');
      } else {
        g.setActiveTab(tab);
      }
    };
    window.addEventListener('guarly_navigate_tab', handleNavigate);
    return () => window.removeEventListener('guarly_navigate_tab', handleNavigate);
  }, [g.setActiveTab, g.setSettingsSubTab]);

  React.useEffect(() => {
    if (g.activeTab === "gallery") {
      setDismissedBanner(localStorage.getItem("dismiss_email_pass_banner_v1") === "true");
    }
  }, [g.activeTab]);

  React.useEffect(() => {
    const handleFcmToken = (e: Event) => {
      const fcmToken = (e as CustomEvent).detail;
      console.log("Visual feedback: FCM Token received in Gallery view:", fcmToken);
      g.showToast("Token de Notificação (FCM) registrado no celular!", "success");
    };
    window.addEventListener("fcm_token_received", handleFcmToken);
    return () => {
      window.removeEventListener("fcm_token_received", handleFcmToken);
    };
  }, [g]);



  if (!cryptoKey) {
    console.error("[Gallery] Acesso bloqueado: Nenhuma chave criptográfica ativa encontrada no cofre.");
    return null;
  }

  const isAdminUser = activeUser?.email === 'jogonesteterp@gmail.com';

  const handleTabChange = (newTab: 'gallery' | 'protected' | 'trash' | 'settings' | 'admin' | 'roulette') => {
    // Block access to non-admin users
    if (newTab === 'admin' && !isAdminUser) {
      g.setActiveTab('gallery');
      return;
    }
    g.setActiveTab(newTab);
    g.setIsSelectionMode(false);
    g.setSelectedForDeletion([]);
  };

  return (
    <div className="bg-[#050505] text-zinc-100 selection:bg-white/20 flex animate-fadeIn h-[100dvh] overflow-hidden w-full">
      <DragOverlay isDraggingGlobal={g.isDraggingGlobal} />
      {g.isMigrationNeeded && <MigrationOverlay migrationItems={g.migrationItems} onComplete={g.completeMigration} />}
      <GallerySidebar
        onViewGallery={() => handleTabChange('gallery')}
        onViewProtected={() => handleTabChange('protected')}
        onOpenTrash={() => handleTabChange('trash')}
        onOpenSettings={() => { g.setSettingsSubTab('menu'); handleTabChange('settings'); }}
        onOpenRoulette={() => handleTabChange('roulette')}
        onOpenAdmin={() => handleTabChange('admin')}
        onLockVault={g.lockVault}
        onLogOut={g.logOut}
        currentView={g.activeTab as any}
        isAdmin={isAdminUser}
      />

      <div className={`flex-1 flex flex-col min-w-0 relative h-full ${g.activeTab === 'admin' || g.activeTab === 'roulette' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        <GalleryConfirmModals
          imageToDelete={g.imageToDelete}
          setImageToDelete={g.setImageToDelete}
          handleDelete={g.handleDelete}
          isDeletingMultiple={g.isDeletingMultiple}
          setIsDeletingMultiple={g.setIsDeletingMultiple}
          handleDeleteMultiple={g.handleDeleteMultiple}
          selectedForDeletion={g.selectedForDeletion}
          isCleaningDuplicates={g.isCleaningDuplicates}
          setIsCleaningDuplicates={g.setIsCleaningDuplicates}
          handleCleanDuplicates={g.handleCleanDuplicates}
          duplicatesToDelete={g.duplicatesToDelete}
        />

        {g.activeTab === 'gallery' && (
          <GalleryHeader
            imagesCount={g.images.length}
            isSelectionMode={g.isSelectionMode}
            setIsSelectionMode={g.setIsSelectionMode}
            setSelectedForDeletion={g.setSelectedForDeletion}
            isInstallable={g.isInstallable}
            promptToInstall={g.promptToInstall}
            isInIframe={g.isInIframe}
            showToast={g.showToast}
            lockVault={g.lockVault}
            logOut={g.logOut}
            setIsSettingsOpen={(open) => open ? handleTabChange('settings') : handleTabChange('gallery')}
            backgroundSyncing={g.backgroundSyncing}
            backgroundSyncProgress={g.backgroundSyncProgress}
          />
        )}

        <GalleryActiveTabContent
          activeTab={g.activeTab}
          setActiveTab={g.setActiveTab}
          settingsSubTab={g.settingsSubTab}
          setSettingsSubTab={g.setSettingsSubTab}
          isSelectionMode={g.isSelectionMode}
          setIsSelectionMode={g.setIsSelectionMode}
          selectedForDeletion={g.selectedForDeletion}
          setSelectedForDeletion={g.setSelectedForDeletion}
          setIsProtectedLightboxOpen={setIsProtectedLightboxOpen}
          images={g.images}
          loading={g.loading}
          securityImageId={g.securityImageId}
          isExtraUnlocked={g.isExtraUnlocked}
          extraPassword={g.extraPassword}
          handleImageClick={g.handleImageClick}
          fetchFullMedia={g.fetchFullMedia}
          setImageToDelete={g.setImageToDelete}
          setImageToProtect={g.setImageToProtect}
          setIsUploaderOpen={g.setIsUploaderOpen}
        />
      </div>

      <GalleryFloatingAddButton
        isSelectionMode={g.isSelectionMode}
        activeTab={g.activeTab}
        setIsUploaderOpen={g.setIsUploaderOpen}
      />

      <AnimatePresence>
        {g.isSelectionMode && (
          <SelectionBottomBar
            selectedForDeletion={g.selectedForDeletion}
            setSelectedForDeletion={g.setSelectedForDeletion}
            setIsSelectionMode={g.setIsSelectionMode}
            images={g.images}
            showToast={g.showToast}
            setDuplicatesToDelete={g.setDuplicatesToDelete}
            setIsCleaningDuplicates={g.setIsCleaningDuplicates}
            setIsDeletingMultiple={g.setIsDeletingMultiple}
          />
        )}
      </AnimatePresence>

      <ExtraPasswordPrompt
        isOpen={!!g.isPromptingExtra}
        extraPasswordInput={g.extraPasswordInput}
        setExtraPasswordInput={g.setExtraPasswordInput}
        onClose={() => {
          g.setIsPromptingExtra(null);
          g.setExtraPasswordInput("");
        }}
        onSubmit={() => g.handleExtraPasswordSubmit()}
      />

      <GalleryUploaderModal
        isUploaderOpen={g.isUploaderOpen}
        setIsUploaderOpen={g.setIsUploaderOpen}
        isUploading={g.isUploading}
        setDroppedFiles={g.setDroppedFiles}
        droppedFiles={g.droppedFiles}
        setIsUploading={g.setIsUploading}
        loadImages={g.loadImages}
      />

      <AnimatePresence>
        {g.selectedImageId && (
          <Lightbox
            images={g.images}
            selectedImage={g.selectedImage}
            selectedImageId={g.selectedImageId}
            selectedImageIsVideo={g.selectedImageIsVideo}
            downloadingFull={g.downloadingFull}
            fullDownloadProgress={g.fullDownloadProgress}
            imageFit={g.imageFit}
            showControls={g.showControls}
            isZoomed={g.isZoomed}
            isFullscreen={g.isFullscreen}
            setIsZoomed={g.setIsZoomed}
            setImageFit={g.setImageFit}
            setIsShareOpen={g.setIsShareOpen}
            setShowControls={g.setShowControls}
            onClose={g.closeLightbox}
            onNext={g.handleNextImage}
            onPrev={g.handlePrevImage}
            onToggleFullscreen={g.toggleFullscreen}
            onDelete={() => g.setImageToDelete(g.selectedImageId)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {g.toast && (
          <Toast
            key="toast-message"
            message={g.toast.message}
            type={g.toast.type}
            onClose={() => g.setToast(null)}
          />
        )}
      </AnimatePresence>

      <ProtectImageModal
        imageToProtect={g.imageToProtect}
        setImageToProtect={g.setImageToProtect}
      />

      <MobileBottomNav
        activeTab={g.activeTab}
        setActiveTab={handleTabChange}
        isSelectionMode={g.isSelectionMode}
        selectedImageId={g.selectedImageId}
        isProtectedLightboxOpen={isProtectedLightboxOpen}
        setIsSelectionMode={g.setIsSelectionMode}
        setSelectedForDeletion={g.setSelectedForDeletion}
        isAdmin={isAdminUser}
      />

      <DownloadPreferenceModal
        isOpen={!!g.showDownloadPrompt && g.activeTab === 'gallery'}
        cloudCount={g.cloudMediaCount}
        onSelectFullDownload={g.onSelectFullDownload}
        onSelectThumbnailsOnly={g.onSelectThumbnailsOnly}
      />

      {g.isShareOpen && g.selectedImageId && g.selectedImage && (
        <ShareModal
          isOpen={g.isShareOpen}
          onClose={() => g.setIsShareOpen(false)}
          imageId={g.selectedImageId}
          decryptedImageUrl={g.selectedImage}
        />
      )}
    </div>
  );
}
