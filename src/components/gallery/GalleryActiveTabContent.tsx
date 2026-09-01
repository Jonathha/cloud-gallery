import React from "react";
import ProtectedGallery from "../ProtectedGallery";
import TrashModal from "../TrashModal";
import SettingsModal from "../SettingsModal";
import GalleryGrid from "./GalleryGrid";
import AdminTab from "../AdminTab";
import { RouletteTab } from "../roulette/RouletteTab";
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
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean) => Promise<void>;
  setImageToDelete: (id: string | null) => void;
  setImageToProtect: (id: string | null) => void;
  setIsUploaderOpen: (open: boolean) => void;
  settingsSubTab?: 'security' | 'fakeVault' | 'storage' | 'repair' | 'account' | 'about' | 'menu' | 'news' | 'control';
  setSettingsSubTab?: (tab: 'security' | 'fakeVault' | 'storage' | 'repair' | 'account' | 'about' | 'menu' | 'news' | 'control') => void;
}

export default function GalleryActiveTabContent({
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
  if (activeTab === "protected") {
    return (
      <ProtectedGallery
        onBack={() => {
          setActiveTab("gallery");
          setIsSelectionMode(false);
          setSelectedForDeletion([]);
        }}
        onLightboxToggle={setIsProtectedLightboxOpen}
      />
    );
  }

  if (activeTab === "trash") {
    return (
      <TrashModal
        isOpen={true}
        onClose={() => setActiveTab("gallery")}
        isInline={true}
        onLightboxToggle={setIsProtectedLightboxOpen}
      />
    );
  }

  if (activeTab === "settings") {
    return (
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
      />
    );
  }

  if (activeTab === "admin") {
    return (
      <AdminTab
        showToast={(msg, type) => {
          const event = new CustomEvent('show-app-toast', { detail: { message: msg, type: type || 'success' } });
          window.dispatchEvent(event);
        }}
        onBackToGallery={() => setActiveTab("gallery")}
      />
    );
  }

  if (activeTab === "roulette") {
    return (
      <RouletteTab
        onBack={() => setActiveTab("gallery")}
      />
    );
  }

  return (
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
  );
}
