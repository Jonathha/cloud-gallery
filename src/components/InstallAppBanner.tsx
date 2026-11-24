import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';
import { isNativeApp, isMobileDevice } from '../utils/isNativeApp';
import { useAppUpdateConfig } from '../hooks/appUpdate/useAppUpdateConfig';
import { resolveApkUrl } from '../utils/apkUrl';

export default function InstallAppBanner() {
  const [show, setShow] = useState(false);
  const { appConfig } = useAppUpdateConfig();

  useEffect(() => {
    const isMobile = isMobileDevice();
    const isApp = isNativeApp();
    const isDismissed = localStorage.getItem('dismiss_install_banner_v3') === 'true';

    if (isMobile && !isApp && !isDismissed) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('dismiss_install_banner_v3', 'true');
    setShow(false);
  };

  const handleInstall = () => {
    const targetApkUrl = resolveApkUrl(appConfig?.apkUrl);
    const link = document.createElement('a');
    link.href = targetApkUrl;
    link.download = 'Guarly.apk';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    localStorage.setItem('dismiss_install_banner_v3', 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          id="install-app-banner"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring', damping: 28, stiffness: 360, mass: 0.7 }}
          className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-[360px] bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl shadow-black/70 z-[9999] flex flex-col gap-3.5 select-none"
        >
          <div className="flex items-start gap-3 relative">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-200 shrink-0">
              <Download size={18} strokeWidth={2} />
            </div>
            
            <div className="text-left pr-6 flex-1">
              <h4 className="text-sm font-semibold text-white tracking-tight">Instalar Aplicativo</h4>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Obtenha carregamento instantâneo e melhor experiência no seu dispositivo.
              </p>
            </div>

            <button
              id="install-banner-close-btn"
              onClick={handleDismiss}
              className="absolute top-0 right-0 p-1 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              id="install-banner-dismiss-btn"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-medium rounded-lg hover:bg-white/5 transition-all cursor-pointer"
            >
              Depois
            </button>
            <button
              id="install-banner-action-btn"
              onClick={handleInstall}
              className="px-4 py-1.5 text-xs bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Download size={13} strokeWidth={2.5} />
              <span>Instalar</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
