import React from 'react';
import { Info, Shield } from 'lucide-react';
import { APP_VERSION } from '../../constants';
import { isNativeApp, isMobileDevice } from '../../utils/isNativeApp';
import AboutTabNative from './AboutTabNative';
import AboutTabWeb from './AboutTabWeb';
import { useAppUpdateConfig } from '../../hooks/appUpdate/useAppUpdateConfig';
import { resolveApkUrl } from '../../utils/apkUrl';

interface AboutTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AboutTab({ showToast }: AboutTabProps) {
  const [isApkInCache, setIsApkInCache] = React.useState(false);
  const [apkSize, setApkSize] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { appConfig } = useAppUpdateConfig();

  React.useEffect(() => {
    const win = window as any;
    const checkApkCache = () => {
      if (win.AndroidBridge) {
        if (typeof win.AndroidBridge.checkIfApkExists === 'function') {
          setIsApkInCache(!!win.AndroidBridge.checkIfApkExists('app-debug.apk'));
        } else if (typeof win.AndroidBridge.isApkCached === 'function') {
          setIsApkInCache(!!win.AndroidBridge.isApkCached());
        }
      }
      
      if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
        win.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CHECK_APK_EXISTS', fileName: 'app-debug.apk' }));
      }
    };

    checkApkCache();

    const previousCallback = win.onApkStatusReceived;
    win.onApkStatusReceived = (exists: boolean, size?: string) => {
      setIsApkInCache(exists);
      if (size) setApkSize(size);
      if (previousCallback) previousCallback(exists, size);
    };

    const handleMsg = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && typeof data === 'object') {
          if (data.type === 'APK_STATUS' || data.type === 'APK_EXISTS_RESPONSE' || data.type === 'CHECK_APK_EXISTS_RESPONSE') {
            setIsApkInCache(data.exists === true || data.value === true || data.status === 'exists');
            if (data.size) setApkSize(data.size);
          }
          if (data.type === 'APK_DELETED' || data.type === 'DELETE_APK_RESPONSE') {
            setIsApkInCache(false);
            setApkSize(null);
            setIsDeleting(false);
            showToast('Cache do instalador APK limpo com sucesso!', 'success');
          }
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleMsg);
    return () => {
      window.removeEventListener('message', handleMsg);
      win.onApkStatusReceived = previousCallback;
    };
  }, [showToast]);

  const postNativeMessage = (msg: any) => {
    const win = window as any;
    const msgStr = JSON.stringify(msg);
    if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
      win.ReactNativeWebView.postMessage(msgStr);
    }
    if (win.AndroidBridge && typeof win.AndroidBridge.installCachedApk === 'function') {
      win.AndroidBridge.installCachedApk('app-debug.apk');
    }
    if (win.webkit && win.webkit.messageHandlers && win.webkit.messageHandlers.guarlyApp) {
      win.webkit.messageHandlers.guarlyApp.postMessage(msg);
    }
    win.parent.postMessage(msg, '*');
  };

  const handleInstallFromCache = () => {
    postNativeMessage({ type: 'INSTALL_CACHED_APK', fileName: 'app-debug.apk' });
    showToast('Iniciando instalação a partir da memória do App...', 'info');
  };

  const handleDeleteFromCache = () => {
    if (isDeleting) return;
    setIsDeleting(true);
    postNativeMessage({ type: 'DELETE_CACHED_APK', fileName: 'app-debug.apk' });

    setTimeout(() => {
      setIsDeleting((curr) => {
        if (curr) {
          setIsApkInCache(false);
          setApkSize(null);
          showToast('Cache do instalador APK limpo!', 'success');
          return false;
        }
        return curr;
      });
    }, 1500);
  };

  const handleInstallApp = () => {
    const targetApkUrl = resolveApkUrl(appConfig?.apkUrl);
    const link = document.createElement('a');
    link.href = targetApkUrl;
    link.download = 'Guarly.apk';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Iniciando o download do aplicativo...', 'info');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/10 rounded-xl text-white">
            <Info size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">Sobre o App</h3>
        </div>

        <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-3xl space-y-5 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-white text-black rounded-[2rem] flex items-center justify-center shadow-2xl">
              <Shield size={40} strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <h4 className="text-xl font-bold text-white">Cloud Gallery</h4>
            <p className="text-sm text-zinc-500 mt-1">Versão {APP_VERSION}</p>
          </div>

          <div className="pt-2">
            <span className="inline-block px-3 py-1.5 bg-zinc-800/80 border border-white/5 rounded-full text-[11px] text-zinc-400 font-medium tracking-wide">
              Criptografia de Ponta a Ponta Ativa
            </span>
          </div>
        </div>
      </div>

      {isNativeApp() && (
        <AboutTabNative
          isApkInCache={isApkInCache}
          apkSize={apkSize}
          isDeleting={isDeleting}
          handleInstallFromCache={handleInstallFromCache}
          handleDeleteFromCache={handleDeleteFromCache}
        />
      )}

      {!isNativeApp() && isMobileDevice() && (
        <AboutTabWeb handleInstallApp={handleInstallApp} />
      )}
    </div>
  );
}
