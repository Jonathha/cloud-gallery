import { useState, useEffect } from "react";
import { useInstallPrompt } from "../../utils/useInstallPrompt";
import { ToastType } from "../../components/Toast";
import { useAndroidTabBridge } from "./state/useAndroidTabBridge";

export function useGalleryGlobalState(showProtectedContext: boolean, setShowProtectedContext: (val: boolean) => void) {
  const { isInstallable, promptToInstall, isInIframe } = useInstallPrompt();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [imageToProtect, setImageToProtect] = useState<string | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'gallery' | 'protected' | 'trash' | 'settings' | 'admin' | 'chat'>('gallery');
  const [settingsSubTab, setSettingsSubTab] = useState<'security' | 'storage' | 'repair' | 'account' | 'about' | 'menu' | 'news'>('menu');
  const [isExtraUnlocked, setIsExtraUnlocked] = useState(false);

  const showToast = (message: string, type: ToastType = "success") => setToast({ message, type });
  useEffect(() => {
    const handleGlobalToast = (e: any) => { if (e.detail) showToast(e.detail.message, e.detail.type); };
    window.addEventListener('show-app-toast', handleGlobalToast);
    return () => window.removeEventListener('show-app-toast', handleGlobalToast);
  }, []);

  useAndroidTabBridge(activeTab, showProtectedContext, setShowProtectedContext, setActiveTab);
  return {
    isInstallable, promptToInstall, isInIframe, toast, setToast, showToast,
    imageToDelete, setImageToDelete, imageToProtect, setImageToProtect,
    isUploaderOpen, setIsUploaderOpen, isUploading, setIsUploading,
    activeTab, setActiveTab, settingsSubTab, setSettingsSubTab, isExtraUnlocked, setIsExtraUnlocked
  };
}
