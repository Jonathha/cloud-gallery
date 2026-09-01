import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download } from 'lucide-react';
import { isNativeApp, isMobileDevice } from '../utils/isNativeApp';
import { getApiUrl } from '../utils/apiUrl';

export default function InstallAppBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isMobile = isMobileDevice();
    const isApp = isNativeApp();
    const isDismissed = localStorage.getItem('dismiss_install_banner_v3') === 'true';

    if (isMobile && !isApp && !isDismissed) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('dismiss_install_banner_v3', 'true');
    setShow(false);
  };

  const handleInstall = () => {
    const targetApkUrl = getApiUrl('/api/update/download');
    const link = document.createElement('a');
    link.href = targetApkUrl;
    link.download = 'app.apk';
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
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-zinc-900/95 backdrop-blur border border-white/10 p-4 rounded-2xl shadow-2xl z-[9999] flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white/5 rounded-xl text-zinc-300 border border-white/5 shrink-0">
              <Download size={20} strokeWidth={2} />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-white tracking-tight">Instalar Aplicativo</h4>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Instale nosso aplicativo móvel para obter melhor desempenho e carregamento instantâneo.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-white/5">
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-semibold transition-colors cursor-pointer"
            >
              DEPOIS
            </button>
            <button
              onClick={handleInstall}
              className="px-4 py-1.5 text-xs bg-white text-black font-bold rounded-xl hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer"
            >
              INSTALAR
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
