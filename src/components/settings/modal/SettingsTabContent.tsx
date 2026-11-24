import React from 'react';
import SecurityTab from '../SecurityTab';
import VaultCryptoTab from '../VaultCryptoTab';
import QuickAccessTab from '../QuickAccessTab';
import DecoyVaultTab from '../DecoyVaultTab';
import StorageTab from '../StorageTab';
import NewsTab from '../NewsTab';
import RepairTab from '../RepairTab';
import AccountTab from '../AccountTab';
import AppearanceTab from '../AppearanceTab';
import AboutTab from '../AboutTab';
import { DecryptedImage } from './types';

interface SettingsTabContentProps {
  activeTab: string;
  s: any;
  images: DecryptedImage[];
  onClose: () => void;
}

export const SettingsTabContent: React.FC<SettingsTabContentProps> = ({
  activeTab,
  s,
  images,
  onClose
}) => {
  switch (activeTab) {
    case 'security':
      return <SecurityTab privacyMode={s.privacyMode} handleTogglePrivacy={s.handleTogglePrivacy} autoLockTimer={s.autoLockTimer} handleSaveTimer={s.handleSaveTimer} />;
    case 'vaultCrypto':
      return <VaultCryptoTab showToast={s.showToast} onClose={onClose} />;
    case 'quickAccess':
      return <QuickAccessTab showToast={s.showToast} />;
    case 'decoyVault':
      return <DecoyVaultTab showToast={s.showToast} />;
    case 'storage':
      return <StorageTab cloudStorageUsed={s.cloudStorageUsed} storageUsage={s.storageUsage} downloading={s.downloading} clearing={s.clearing} handleRemoveFailedImages={s.handleRemoveFailedImages} handleDownloadAll={s.handleDownloadAll} handleClearCache={s.handleClearCache} images={images} formatBytes={s.formatBytes} />;
    case 'news':
      return <NewsTab showToast={s.showToast} />;
    case 'repair':
      return <RepairTab clearing={s.clearing} setClearing={s.setClearing} showToast={s.showToast} />;
    case 'account':
      return <AccountTab user={s.user} isInstallable={s.isInstallable} promptToInstall={s.promptToInstall} isInIframe={s.isInIframe} showToast={s.showToast} logOut={s.logOut} onClose={onClose} />;
    case 'appearance':
      return <AppearanceTab showToast={s.showToast} />;
    case 'about':
      return <AboutTab showToast={s.showToast} />;
    default:
      return null;
  }
};
