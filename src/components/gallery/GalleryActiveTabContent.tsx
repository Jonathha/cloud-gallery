import React from "react";
import ProtectedGallery from "../ProtectedGallery";
import TrashModal from "../TrashModal";
import SettingsModal from "../SettingsModal";
import GalleryGrid from "./GalleryGrid";
import AdminTab from "../AdminTab";
import ChatTab from "../ChatTab";
import { DecryptedImage } from "../../types";

interface GalleryActiveTabContentProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isSelectionMode: boolean;
  setIsSelectionMode: (mode: boolean) => void;
  selectedForDeletion: string[];
  setSelectedForDeletion: (ids: string[]) => void;
  setIsProtectedLightboxOpen: (open: boolean) => void;
  images: DecryptedImage[];
  loading: boolean;
  securityImageId: string | null;
  isExtraUnlocked: boolean;
  extraPassword: string | null;
  handleImageClick: (img: DecryptedImage, index: number, e: React.MouseEvent) => void;
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean, priority?: number) => Promise<void>;
  setImageToDelete: (id: string | null) => void;
  setImageToProtect: (id: string | null) => void;
  setIsUploaderOpen: (open: boolean) => void;
  settingsSubTab?: 'security' | 'storage' | 'repair' | 'account' | 'about' | 'menu' | 'news';
  setSettingsSubTab?: (tab: 'security' | 'storage' | 'repair' | 'account' | 'about' | 'menu' | 'news') => void;
}

function GalleryActiveTabContent({
  activeTab,
  setActiveTab,
  isSelectionMode,
  setIsSelectionMode,
  selectedForDeletion,
  setSelectedForDeletion,
  setIsProtectedLightboxOpen,
  images,
  loading,
  securityImageId,
  isExtraUnlocked,
  extraPassword,
  handleImageClick,
  fetchFullMedia,
  setImageToDelete,
  setImageToProtect,
  setIsUploaderOpen,
  settingsSubTab = 'menu',
  setSettingsSubTab,
}: GalleryActiveTabContentProps) {
  const galleryContent = (
    <div className={activeTab === "gallery" ? "contents" : "hidden"}>
      <GalleryGrid
        loading={loading}
        images={images}
        isSelectionMode={isSelectionMode}
        setIsSelectionMode={setIsSelectionMode}
        selectedForDeletion={selectedForDeletion}
        setSelectedForDeletion={setSelectedForDeletion}
        securityImageId={securityImageId}
        isExtraUnlocked={isExtraUnlocked}
        extraPassword={extraPassword}
        handleImageClick={handleImageClick}
        fetchFullMedia={fetchFullMedia}
        setImageToDelete={setImageToDelete}
        setImageToProtect={setImageToProtect}
        setIsUploaderOpen={setIsUploaderOpen}
      />
    </div>
  );

  if (activeTab === "protected") {
    return (
      <>
        {galleryContent}
        <ProtectedGallery
          onBack={() => {
            setActiveTab("gallery");
            setIsSelectionMode(false);
            setSelectedForDeletion([]);
          }}
          onLightboxToggle={setIsProtectedLightboxOpen}
        />
      </>
    );
  }

  if (activeTab === "trash") {
    return (
      <>
        {galleryContent}
        <TrashModal
          isOpen={true}
          onClose={() => setActiveTab("gallery")}
          isInline={true}
          onLightboxToggle={setIsProtectedLightboxOpen}
        />
      </>
    );
  }

  if (activeTab === "settings") {
    return (
      <>
        {galleryContent}
        <SettingsModal
          isOpen={true}
          onClose={() => {
            setActiveTab("gallery");
            if (setSettingsSubTab) setSettingsSubTab("menu");
          }}
          images={images}
          onOpenTrash={() => setActiveTab("trash")}
          isInline={true}
          initialTab={settingsSubTab}
          onSubTabChange={setSettingsSubTab}
        />
      </>
    );
  }

  if (activeTab === "admin") {
    return (
      <>
        {galleryContent}
        <AdminTab
          showToast={(msg, type) => {
            const event = new CustomEvent('show-app-toast', { detail: { message: msg, type: type || 'success' } });
            window.dispatchEvent(event);
          }}
          onBackToGallery={() => setActiveTab("gallery")}
        />
      </>
    );
  }

  if (activeTab === "chat") {
    return (
      <>
        {galleryContent}
        <ChatTab
          onBackToGallery={() => setActiveTab("gallery")}
        />
      </>
    );
  }

  return galleryContent;
}

export default React.memo(GalleryActiveTabContent);
