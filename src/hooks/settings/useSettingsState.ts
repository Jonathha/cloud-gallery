import { useState, useEffect } from 'react';
import { ToastType } from '../../components/Toast';
import { isNativeApp } from '../../utils/isNativeApp';

export function useSettingsState(
  isOpen: boolean,
  extraPassword: string | null,
  initialTab?: string
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
    { id: 'decoyVault', label: 'Cofre Falso', icon: 'EyeOff', description: 'Configure um acesso local falso por PIN' },
    { id: 'fakeVault', label: 'Imagem Protegida', icon: 'Lock', description: 'Oculte fotos com senha de segurança' },
    { id: 'control', label: 'Controle', icon: 'Radio', description: 'Monitoramento e acesso remoto de aparelhos' },
    { id: 'storage', label: 'Armazenamento', icon: 'HardDrive', description: 'Cache e limpeza de dados' },
    { id: 'repair', label: 'Reparar Cofre', icon: 'Wrench', description: 'Corrigir erros de carregamento' },
    { id: 'account', label: 'Conta', icon: 'User', description: 'Sua sessão e instalação' },
    { id: 'appearance', label: 'Aparência', icon: 'Palette', description: 'Tema visual do aplicativo' },
    { id: 'installApp', label: 'Instalar App', icon: 'Download', description: 'Baixe a versão móvel oficial (.apk)' },
    { id: 'about', label: 'Sobre', icon: 'Sparkles', description: 'Versão e informações do app' },
  ] as const;

  const tabs = allTabs.filter(tab => {
    if (isFakeVaultActive) {
      return tab.id !== 'decoyVault' && tab.id !== 'fakeVault' && tab.id !== 'control';
    }
    if (tab.id === 'installApp' && isNativeApp()) {
      return false;
    }
    return true;
  });

  const [activeTab, setActiveTab] = useState<typeof allTabs[number]['id'] | 'menu' | 'news'>((initialTab as any) || 'menu');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab as any);
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
