import { useState, useEffect } from 'react';
import { UpdateState } from './types';

export function useAppUpdateNative() {
  const [runningVersionName, setRunningVersionName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlVersion = searchParams.get('version') || searchParams.get('versionName') || searchParams.get('v') || searchParams.get('appVersion');
      if (urlVersion) {
        localStorage.setItem('app_version_name', urlVersion);
        return urlVersion;
      }
    }
    return typeof window !== 'undefined' ? localStorage.getItem('app_version_name') : null;
  });

  const [runningBuildNumber, setRunningBuildNumber] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlBuild = searchParams.get('build') || searchParams.get('buildNumber') || searchParams.get('versionCode') || searchParams.get('b');
      if (urlBuild) {
        localStorage.setItem('app_version_code', urlBuild);
        return urlBuild;
      }
    }
    return typeof window !== 'undefined' ? localStorage.getItem('app_version_code') : null;
  });

  const [isInApp, setIsInApp] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const win = window as any;
    const ua = navigator.userAgent || '';
    
    const hasGuarlyUA = /GuarlyApp/i.test(ua);
    const hasGuarlyAppBridge = typeof win.GuarlyApp !== 'undefined' || typeof (window as any).GuarlyApp !== 'undefined';
    const hasAndroidBridge = typeof win.AndroidBridge !== 'undefined' || typeof (window as any).AndroidBridge !== 'undefined' || typeof win.Android !== 'undefined';
    const hasNativeBridge = typeof win.GuarlyNativeBridge !== 'undefined' || typeof (window as any).GuarlyNativeBridge !== 'undefined';
    const hasReactNativeWebView = typeof win.ReactNativeWebView !== 'undefined' || typeof (window as any).ReactNativeWebView !== 'undefined';
    
    const searchParams = new URLSearchParams(window.location.search);
    const hasAppParam = searchParams.has('app') || 
                        searchParams.has('webview') || 
                        searchParams.has('native') || 
                        searchParams.has('forceUpdate') || 
                        searchParams.has('version') || 
                        searchParams.has('build') || 
                        !!searchParams.get('versionName') || 
                        !!searchParams.get('versionCode');

    return !!(hasGuarlyUA || hasGuarlyAppBridge || hasAndroidBridge || hasNativeBridge || hasReactNativeWebView || hasAppParam);
  });

  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [progress, setProgress] = useState(0);
  const [isApkInCache, setIsApkInCache] = useState(false);
  const [apkSize, setApkSize] = useState<string | null>(null);

  // Integration with native bridge
  useEffect(() => {
    const win = window as any;
    let lastLoggedVersion: string | null = null;
    
    const checkAndSetVersion = (vName?: string, vCode?: number | string) => {
      const logKey = `${vName}_${vCode}`;
      if (lastLoggedVersion !== logKey && (vName || vCode)) {
        lastLoggedVersion = logKey;
        console.log('[AppUpdateCheckOverlay] Versão recebida do dispositivo:', { vName, vCode });
      }

      if (vName) {
        localStorage.setItem('app_version_name', vName);
        setRunningVersionName(vName);
      }
      if (vCode !== undefined && vCode !== null) {
        localStorage.setItem('app_version_code', String(vCode));
        setRunningBuildNumber(String(vCode));
      }
    };

    const handleAppDetailsLoaded = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        const { version, buildNumber } = customEvent.detail;
        checkAndSetVersion(version, buildNumber);
      }
    };
    window.addEventListener('appDetailsLoaded', handleAppDetailsLoaded);

    if (win.appVersion || win.appBuildNumber) {
      checkAndSetVersion(win.appVersion, win.appBuildNumber);
    }

    const getNativeDetails = () => {
      const bridges = [
        win.AndroidBridge,
        win.GuarlyApp,
        win.GuarlyNativeBridge,
        win.Android,
        win.webkit?.messageHandlers?.AndroidBridge,
        win.webkit?.messageHandlers?.GuarlyApp
      ];

      for (const b of bridges) {
        if (!b) continue;
        try {
          let vName: string | undefined = undefined;
          if (typeof b.getAppVersion === 'function') {
            vName = b.getAppVersion();
          } else if (typeof b.getVersionName === 'function') {
            vName = b.getVersionName();
          } else if (b.appVersion) {
            vName = String(b.appVersion);
          }

          let vCode: string | number | undefined = undefined;
          if (typeof b.getAppBuildNumber === 'function') {
            vCode = b.getAppBuildNumber();
          } else if (typeof b.getVersionCode === 'function') {
            vCode = b.getVersionCode();
          } else if (typeof b.getBuildNumber === 'function') {
            vCode = b.getBuildNumber();
          } else if (b.appBuildNumber) {
            vCode = String(b.appBuildNumber);
          }

          if (vName || vCode) {
            return { vName, vCode };
          }
        } catch (err) {
          console.warn("Erro ao ler da ponte nativa:", err);
        }
      }
      return null;
    };

    const checkUserAgentVersion = () => {
      const ua = navigator.userAgent || '';
      const match = ua.match(/GuarlyApp\/([0-9.]+)/i);
      if (match && match[1]) {
        checkAndSetVersion(match[1], undefined);
        setIsInApp(true);
        return true;
      } else if (/GuarlyApp/i.test(ua)) {
        setIsInApp(true);
        return true;
      }
      return false;
    };

    const checkBridges = () => {
      const foundUA = checkUserAgentVersion();
      const nativeDetails = getNativeDetails();
      
      if (nativeDetails) {
        setIsInApp(true);
        checkAndSetVersion(nativeDetails.vName, nativeDetails.vCode);
        return true;
      }
      const bridge = win.AndroidBridge || win.GuarlyApp || win.GuarlyNativeBridge || win.Android;
      if (bridge) {
        setIsInApp(true);
        return true;
      }
      
      return foundUA;
    };

    checkBridges();

    let pollAttempts = 0;
    const pollInterval = setInterval(() => {
      pollAttempts++;
      const found = checkBridges();
      if (found || pollAttempts >= 20) {
        clearInterval(pollInterval);
      }
    }, 300);

    const cachedVName = localStorage.getItem('app_version_name');
    const cachedVCode = localStorage.getItem('app_version_code');
    if (cachedVName || cachedVCode) {
      checkAndSetVersion(cachedVName || undefined, cachedVCode ? String(cachedVCode) : undefined);
    }

    win.onDownloadProgress = (p: number) => {
      setUpdateState('downloading');
      setProgress(Math.min(100, Math.max(0, Number(p))));
      if (p >= 100) {
        setUpdateState('installing');
      }
    };
    win.updateDownloadProgress = win.onDownloadProgress;
    win.setDownloadProgress = win.onDownloadProgress;

    win.onApkStatusReceived = (exists: boolean, size?: string) => {
      setIsApkInCache(exists);
      if (size) setApkSize(size);
    };

    const checkApkInCache = () => {
      const bridge = win.AndroidBridge || win.GuarlyApp || win.GuarlyNativeBridge;
      if (bridge) {
        if (typeof bridge.checkIfApkExists === 'function') {
          const exists = bridge.checkIfApkExists('app-release.apk');
          setIsApkInCache(!!exists);
        } else if (typeof bridge.isApkCached === 'function') {
          setIsApkInCache(!!bridge.isApkCached());
        }
      }
    };

    checkApkInCache();

    return () => {
      window.removeEventListener('appDetailsLoaded', handleAppDetailsLoaded);
      clearInterval(pollInterval);
      delete win.onDownloadProgress;
      delete win.updateDownloadProgress;
      delete win.setDownloadProgress;
      delete win.onApkStatusReceived;
    };
  }, []);

  return {
    runningVersionName,
    runningBuildNumber,
    isInApp,
    updateState,
    setUpdateState,
    progress,
    setProgress,
    isApkInCache,
    apkSize
  };
}
