import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { isNativeApp } from "../utils/isNativeApp";
import { Shield, HardDrive, User, Trash2, Lock, Sparkles, Wrench, Radio, EyeOff, Download, Bot, Palette } from 'lucide-react';
import Toast from './Toast';

import SecurityTab from './settings/SecurityTab';
import FakeVaultTab from './settings/FakeVaultTab';
import DecoyVaultTab from './settings/DecoyVaultTab';
import ControlTab from './settings/ControlTab';
import StorageTab from './settings/StorageTab';
import NewsTab from './settings/NewsTab';
import RepairTab from './settings/RepairTab';
import AccountTab from './settings/AccountTab';
import AppearanceTab from './settings/AppearanceTab';
import AboutTab from './settings/AboutTab';
import InstallAppTab from './settings/InstallAppTab';
import { useSettingsLogic } from '../hooks/useSettingsLogic';
import { SettingsHeader } from './settings/SettingsHeader';
import { SettingsMenu } from './settings/SettingsMenu';

interface DecryptedImage {
  id: string;
  url: string;
  failed?: boolean;
  createdAt: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  images?: DecryptedImage[];
  onOpenTrash?: () => void;
  isInline?: boolean;
  initialTab?: 'security' | 'fakeVault' | 'storage' | 'repair' | 'account' | 'appearance' | 'about' | 'menu' | 'news' | 'control' | 'decoyVault' | 'ai';
}

const ICON_MAP = {
  Shield,
  Lock,
  Radio,
  HardDrive,
  Trash2,
  Sparkles,
  Wrench,
  User,
  EyeOff,
  Download,
  Bot,
  Palette,
};

const CATEGORY_GROUPS = [
  {
    title: 'Segurança & Privacidade',
    ids: ['security', 'decoyVault', 'fakeVault', 'control']
  },
  {
    title: 'Armazenamento & Manutenção',
    ids: ['storage', 'repair']
  },
  {
    title: 'Conta & Aplicativo',
    ids: ['account', 'appearance', 'installApp', 'about']
  }
];

export default function SettingsModal({ isOpen, onClose, images = [], onOpenTrash, isInline, initialTab }: SettingsModalProps) {
  const isApp = isNativeApp();
  const s = useSettingsLogic(isOpen, images, onClose, onOpenTrash, initialTab);

  // Single-time entrance animation per session
  const [hasAnimated, setHasAnimated] = React.useState(() => {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('settings_animated_v2') === 'true';
  });

  React.useEffect(() => {
    if (isOpen && !hasAnimated) {
      sessionStorage.setItem('settings_animated_v2', 'true');
      setHasAnimated(true);
    }
  }, [isOpen, hasAnimated]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  // On PC (md screens and up), if activeTab is 'menu', default to first tab so user sees dual-pane
  React.useEffect(() => {
    if (s.activeTab === 'menu' && typeof window !== 'undefined' && window.innerWidth >= 768) {
      if (s.tabs && s.tabs.length > 0) {
        s.setActiveTab(s.tabs[0].id as any);
      }
    }
  }, [s.activeTab, s.tabs, s.setActiveTab]);

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case 'security':
        return (
          <SecurityTab
            privacyMode={s.privacyMode}
            handleTogglePrivacy={s.handleTogglePrivacy}
            autoLockTimer={s.autoLockTimer}
            handleSaveTimer={s.handleSaveTimer}
          />
        );
      case 'decoyVault':
        return <DecoyVaultTab showToast={s.showToast} />;
      case 'fakeVault':
        return (
          <FakeVaultTab
            extraPassword={s.extraPassword}
            isSettingsUnlocked={s.isSettingsUnlocked}
            setIsSettingsUnlocked={s.setIsSettingsUnlocked}
            unlockPasswordInput={s.unlockPasswordInput}
            setUnlockPasswordInput={s.setUnlockPasswordInput}
            newExtraPassword={s.newExtraPassword}
            setNewExtraPassword={s.setNewExtraPassword}
            handleUpdateExtraPassword={s.handleUpdateExtraPassword}
            isUpdatingPassword={s.isUpdatingPassword}
            securityImageId={s.securityImageId}
            setSecurityImage={s.setSecurityImage}
            images={images}
            showToast={s.showToast}
          />
        );
      case 'control':
        return <ControlTab showToast={s.showToast} />;
      case 'storage':
        return (
          <StorageTab
            cloudStorageUsed={s.cloudStorageUsed}
            storageUsage={s.storageUsage}
            downloading={s.downloading}
            clearing={s.clearing}
            handleRemoveFailedImages={s.handleRemoveFailedImages}
            handleDownloadAll={s.handleDownloadAll}
            handleClearCache={s.handleClearCache}
            images={images}
            formatBytes={s.formatBytes}
          />
        );
      case 'news':
        return <NewsTab showToast={s.showToast} />;
      case 'repair':
        return (
          <RepairTab
            clearing={s.clearing}
            setClearing={s.setClearing}
            showToast={s.showToast}
          />
        );
      case 'account':
        return (
          <AccountTab
            user={s.user}
            isInstallable={s.isInstallable}
            promptToInstall={s.promptToInstall}
            isInIframe={s.isInIframe}
            showToast={s.showToast}
            logOut={s.logOut}
            onClose={onClose}
          />
        );
      case 'appearance':
        return <AppearanceTab showToast={s.showToast} />;
      case 'installApp':
        return <InstallAppTab showToast={s.showToast} />;
      case 'about':
        return <AboutTab showToast={s.showToast} />;
      default:
        return null;
    }
  };

  const content = (
    <div className={`flex flex-col bg-zinc-950 ${isInline ? 'h-full w-full' : 'relative w-full max-w-4xl md:rounded-3xl shadow-2xl overflow-hidden border-0 md:border border-white/10 h-[100dvh] md:h-[650px] md:max-h-[85vh]'}`}>
      
      {/* Responsive Layout: PC (md:) has left sidebar + right content; Mobile (<md) has drill-down */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative overflow-hidden">
        
        {/* Desktop Sidebar (md:) */}
        <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-white/5 bg-[#080808] shrink-0 overflow-y-auto p-4 space-y-5 select-none">
          <div className="px-2 pt-2 pb-1 border-b border-white/5">
            <h2 className="text-lg font-bold text-white tracking-tight">Configurações</h2>
            <p className="text-xs text-zinc-500">Ajustes do cofre e conta</p>
          </div>

          {CATEGORY_GROUPS.map((group) => {
            const groupTabs = s.tabs.filter(t => group.ids.includes(t.id));
            if (groupTabs.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 mb-1.5">
                  {group.title}
                </h4>
                {groupTabs.map((tab) => {
                  const Icon = (ICON_MAP as any)[tab.icon] || Sparkles;
                  const isActive = s.activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => s.setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left group ${
                        isActive
                          ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/10'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={16} className={isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#050505] overflow-hidden relative">
          <SettingsHeader
            isApp={isApp}
            activeTab={s.activeTab}
            tabs={s.tabs}
            setActiveTab={s.setActiveTab}
          />

          <div 
            className="flex-1 overflow-y-auto overscroll-contain touch-pan-y relative"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <AnimatePresence mode="wait">
              {s.activeTab === 'menu' ? (
                <div className="md:hidden">
                  <SettingsMenu
                    tabs={s.tabs}
                    onOpenTrash={onOpenTrash}
                    isInline={isInline}
                    handleClose={s.handleClose}
                    setActiveTab={s.setActiveTab}
                    ICON_MAP={ICON_MAP}
                    hasAnimated={hasAnimated}
                  />
                </div>
              ) : (
                <motion.div
                  key={s.activeTab}
                  initial={hasAnimated ? false : { opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="p-4 sm:p-6 pb-28 md:pb-8 min-h-full"
                >
                  <div className="max-w-xl mx-auto">
                    {renderTabContent(s.activeTab)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );

  if (isInline) return (
    <motion.div
      initial={hasAnimated ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="h-full w-full"
    >
      {content}
      {s.toast && (
        <Toast
          key="settings-toast"
          message={s.toast.message}
          type={s.toast.type}
          onClose={() => s.setToast(null)}
        />
      )}
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="settings-modal"
          initial={hasAnimated ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6"
        >
          <div
            onClick={() => s.handleClose()}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={hasAnimated ? false : { scale: 0.98, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 15 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col h-full w-full max-w-4xl relative z-10"
          >
            {content}
          </motion.div>
        </motion.div>
      )}
      {s.toast && (
        <Toast
          key="settings-toast"
          message={s.toast.message}
          type={s.toast.type}
          onClose={() => s.setToast(null)}
        />
      )}
    </AnimatePresence>
  );
}
