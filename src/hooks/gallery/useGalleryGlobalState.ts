import { useState, useEffect } from "react";
import { useInstallPrompt } from "../../utils/useInstallPrompt";
import { ToastType } from "../../components/Toast";

export function useGalleryGlobalState(showProtectedContext: boolean, setShowProtectedContext: (val: boolean) => void) {
  const { isInstallable, promptToInstall, isInIframe } = useInstallPrompt();
  
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [imageToProtect, setImageToProtect] = useState<string | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'gallery' | 'protected' | 'trash' | 'settings' | 'admin' | 'roulette'>('gallery');
  const [settingsSubTab, setSettingsSubTab] = useState<'security' | 'fakeVault' | 'storage' | 'repair' | 'account' | 'about' | 'menu' | 'news' | 'control'>('menu');
  const [isExtraUnlocked, setIsExtraUnlocked] = useState(false);

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    const handleGlobalToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType }>;
      if (customEvent.detail) showToast(customEvent.detail.message, customEvent.detail.type);
    };
    window.addEventListener('show-app-toast', handleGlobalToast);
    return () => window.removeEventListener('show-app-toast', handleGlobalToast);
  }, []);

  useEffect(() => {
    setShowProtectedContext(activeTab === 'protected');
    if (typeof window !== "undefined" && window.AndroidBridge) {
      if (typeof window.AndroidBridge.onTabChanged === "function") {
        try { window.AndroidBridge.onTabChanged(activeTab); } catch (err) {}
      }
      if (activeTab === 'protected' && typeof window.AndroidBridge.onPrivateModeClicked === "function") {
        try { window.AndroidBridge.onPrivateModeClicked(); } catch (err) {}
      }
    }
  }, [activeTab, setShowProtectedContext]);

  useEffect(() => {
    if (showProtectedContext) setActiveTab('protected');
  }, [showProtectedContext]);

  return {
    isInstallable, promptToInstall, isInIframe,
    toast, setToast, showToast,
    imageToDelete, setImageToDelete,
    imageToProtect, setImageToProtect,
    isUploaderOpen, setIsUploaderOpen,
    isUploading, setIsUploading,
    activeTab, setActiveTab,
    settingsSubTab, setSettingsSubTab,
    isExtraUnlocked, setIsExtraUnlocked
  };
}
