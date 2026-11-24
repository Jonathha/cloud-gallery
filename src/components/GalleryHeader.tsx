import React from 'react';
import { motion } from 'motion/react';
import { isNativeApp } from "../utils/isNativeApp";
import { DownloadCloud, Lock, LogOut } from 'lucide-react';

interface GalleryHeaderProps {
  imagesCount: number;
  isSelectionMode?: boolean;
  setIsSelectionMode?: (val: boolean) => void;
  setSelectedForDeletion?: (val: string[]) => void;
  isInstallable: boolean;
  promptToInstall: () => void;
  isInIframe: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  lockVault: () => void;
  logOut: () => void;
  setIsSettingsOpen: (val: boolean) => void;
  backgroundSyncing?: boolean;
  backgroundSyncProgress?: number;
}

export default function GalleryHeader({
  imagesCount,
  isSelectionMode,
  setIsSelectionMode,
  setSelectedForDeletion,
  isInstallable,
  promptToInstall,
  isInIframe,
  showToast,
  lockVault,
  logOut,
  setIsSettingsOpen,
  backgroundSyncing,
  backgroundSyncProgress
}: GalleryHeaderProps) {
  const isApp = isNativeApp();
  return (
    <header 
      style={{ paddingTop: isApp ? '2.5rem' : 'calc(0.6rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.6rem' }}
      className="sticky top-0 z-40 bg-[#050505]/95 border-b border-white/[0.06] px-3 sm:px-6 lg:px-8 min-h-14 sm:min-h-18 flex items-center justify-between transition-colors w-full max-w-full overflow-x-hidden"
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-1.5 truncate">
            <span className="truncate">Sua Galeria</span>
            {backgroundSyncing && (
               <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="shrink-0"
               >
                 <DownloadCloud size={15} className="text-zinc-400" />
               </motion.div>
            )}
          </h2>
          <p className="text-[11px] sm:text-xs text-zinc-400 font-normal truncate">
            {imagesCount} {imagesCount === 1 ? 'foto protegida' : 'fotos protegidas'}
            {backgroundSyncing && ` • Sincronizando (${backgroundSyncProgress}%)`}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          onClick={lockVault}
          aria-label="Bloquear cofre"
          title="Bloquear cofre"
          className="lg:hidden p-2 sm:p-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-xl border border-transparent hover:border-white/10 transition-all active:scale-95 w-11 h-11 flex items-center justify-center cursor-pointer shrink-0"
        >
          <Lock size={17} />
        </button>
        <button
          onClick={logOut}
          aria-label="Sair da conta"
          title="Sair da conta"
          className="lg:hidden p-2 sm:p-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all active:scale-95 w-11 h-11 flex items-center justify-center cursor-pointer shrink-0"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
