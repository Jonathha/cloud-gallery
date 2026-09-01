import { useAuth } from '../contexts/AuthContext';
import { useInstallPrompt } from '../utils/useInstallPrompt';
import { notifyAppPrivacyMode } from '../utils/appBridge';
import { DecryptedImage } from './settings/types';
import { useSettingsState } from './settings/useSettingsState';
import { useSettingsStorage } from './settings/useSettingsStorage';
import { useSettingsBackup } from './settings/useSettingsBackup';
import { useSettingsAuth } from './settings/useSettingsAuth';

export function useSettingsLogic(
  isOpen: boolean,
  images: DecryptedImage[],
  onClose: () => void,
  onOpenTrash?: () => void,
  initialTab?: 'security' | 'fakeVault' | 'storage' | 'repair' | 'account' | 'appearance' | 'about' | 'menu' | 'news' | 'control' | 'decoyVault' | 'ai'
) {
  const { user, logOut, extraPassword, securityImageId, updateExtraPassword, setSecurityImage, cryptoKey } = useAuth();
  const { isInstallable, promptToInstall, isInIframe } = useInstallPrompt();

  const state = useSettingsState(isOpen, extraPassword, initialTab);

  const { handleRemoveFailedImages, handleClearCache } = useSettingsStorage(
    isOpen, user, images, state.setStorageUsage, state.setCloudStorageUsed, state.setClearing, state.showToast
  );

  const { handleDownloadAll } = useSettingsBackup(
    user, cryptoKey, state.setDownloading, state.showToast
  );

  const { handleUpdateExtraPassword } = useSettingsAuth(
    state.newExtraPassword, updateExtraPassword, state.setIsUpdatingPassword, state.showToast
  );

  const handleClose = () => {
    state.setIsSettingsUnlocked(false);
    state.setUnlockPasswordInput('');
    state.setActiveTab('menu');
    onClose();
  };

  const handleSaveTimer = (val: string) => {
    state.setAutoLockTimer(val);
    localStorage.setItem('autoLockTimer', val);
    state.showToast('Tempo de bloqueio atualizado');
  };

  const handleTogglePrivacy = () => {
    const newVal = !state.privacyMode;
    state.setPrivacyMode(newVal);
    localStorage.setItem('privacyMode', String(newVal));
    state.showToast(newVal ? 'Modo Privacidade ativado' : 'Modo Privacidade desativado');
    notifyAppPrivacyMode(newVal);
  };

  return {
    user, logOut, extraPassword, securityImageId, setSecurityImage, cryptoKey,
    isInstallable, promptToInstall, isInIframe,
    autoLockTimer: state.autoLockTimer,
    privacyMode: state.privacyMode,
    toast: state.toast, setToast: state.setToast,
    clearing: state.clearing, setClearing: state.setClearing,
    downloading: state.downloading,
    storageUsage: state.storageUsage,
    cloudStorageUsed: state.cloudStorageUsed,
    newExtraPassword: state.newExtraPassword, setNewExtraPassword: state.setNewExtraPassword,
    isUpdatingPassword: state.isUpdatingPassword,
    isSettingsUnlocked: state.isSettingsUnlocked, setIsSettingsUnlocked: state.setIsSettingsUnlocked,
    unlockPasswordInput: state.unlockPasswordInput, setUnlockPasswordInput: state.setUnlockPasswordInput,
    activeTab: state.activeTab, setActiveTab: state.setActiveTab,
    tabs: state.tabs,
    formatBytes: state.formatBytes,
    handleClose, handleSaveTimer, handleTogglePrivacy, showToast: state.showToast,
    handleRemoveFailedImages, handleClearCache, handleDownloadAll,
    handleUpdateExtraPassword,
  };
}
