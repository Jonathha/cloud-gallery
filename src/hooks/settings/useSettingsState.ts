import { useState, useEffect } from 'react';
import { ToastType } from '../../components/Toast';

export function useSettingsState(
  isOpen: boolean,
  extraPassword: string | null,
  initialTab?: string,
  onSubTabChange?: (tab: string) => void
) {
  const [autoLockTimer, setAutoLockTimer] = useState<string>('15');
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [cloudStorageUsed, setCloudStorageUsed] = useState<number>(0);
  const [newExtraPassword, setNewExtraPassword] = useState(extraPassword || '');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  
  const isFakeVaultActive = typeof window !== 'undefined' && sessionStorage.getItem('is_fake_vault_active') === 'true';

  const allTabs = [
    { id: 'security', label: 'Segurança', icon: 'Shield', description: 'Privacidade e bloqueio automático' },
    { id: 'vaultCrypto', label: 'Criptografia do Cofre', icon: 'KeyRound', description: 'Senha mestre e nível de proteção' },
    { id: 'quickAccess', label: 'Acesso Rápido', icon: 'Zap', description: 'Entrada direta sem digitar senha neste aparelho' },
    { id: 'decoyVault', label: 'Cofre Falso', icon: 'VenetianMask', description: 'Configure um acesso local falso por PIN' },
    { id: 'storage', label: 'Armazenamento', icon: 'HardDrive', description: 'Cache e limpeza de dados' },
    { id: 'repair', label: 'Reparar Cofre', icon: 'Wrench', description: 'Corrigir erros de carregamento' },
    { id: 'account', label: 'Conta', icon: 'User', description: 'Sua sessão e credenciais de login' },
    { id: 'appearance', label: 'Aparência', icon: 'Palette', description: 'Tema visual do aplicativo' },
    { id: 'about', label: 'Sobre', icon: 'Info', description: 'Versão e informações do app' },
  ] as const;

  const tabs = allTabs.filter(tab => {
    if (isFakeVaultActive) {
      return tab.id !== 'decoyVault' && tab.id !== 'quickAccess' && tab.id !== 'vaultCrypto';
    }
    return true;
  });

  const [activeTab, setActiveTabState] = useState<typeof allTabs[number]['id'] | 'menu' | 'news'>(() => {
    if (initialTab) return initialTab as any;
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      return 'security';
    }
    return 'menu';
  });

  const setActiveTab = (tab: any) => {
    setActiveTabState(tab);
    onSubTabChange?.(tab);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab as any);
      } else if (typeof window !== 'undefined' && window.innerWidth >= 768 && activeTab === 'menu') {
        setActiveTab('security');
      }
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    setNewExtraPassword(extraPassword || '');
  }, [extraPassword]);

  useEffect(() => {
    let savedTimer = localStorage.getItem('autoLockTimer') || '15';
    if (savedTimer === '5') {
      savedTimer = '1';
      localStorage.setItem('autoLockTimer', '1');
    }
    setAutoLockTimer(savedTimer);
    const savedPrivacy = localStorage.getItem('privacyMode') === 'true';
    setPrivacyMode(savedPrivacy);
  }, []);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    autoLockTimer, setAutoLockTimer,
    privacyMode, setPrivacyMode,
    toast, setToast, showToast,
    clearing, setClearing,
    downloading, setDownloading,
    storageUsage, setStorageUsage,
    cloudStorageUsed, setCloudStorageUsed,
    newExtraPassword, setNewExtraPassword,
    isUpdatingPassword, setIsUpdatingPassword,
    isSettingsUnlocked, setIsSettingsUnlocked,
    unlockPasswordInput, setUnlockPasswordInput,
    isFakeVaultActive,
    tabs,
    activeTab, setActiveTab,
    formatBytes
  };
}
