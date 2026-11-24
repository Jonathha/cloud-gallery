import { useState, useMemo } from 'react';
import { isVersionOlder } from '../utils/versionCheck';
import { getApiUrl } from '../utils/apiUrl';
import { APP_VERSION } from '../constants';
import { useAppUpdateConfig } from './appUpdate/useAppUpdateConfig';
import { useAppUpdateSecurity } from './appUpdate/useAppUpdateSecurity';
import { useAppUpdateNative } from './appUpdate/useAppUpdateNative';
import { useAppUpdateActions } from './appUpdate/useAppUpdateActions';
import type { AppConfig } from './appUpdate/types';

export type { AppConfig };

import { resolveApkUrl } from '../utils/apkUrl';

export function useAppUpdate() {
  const [isDismissed, setIsDismissed] = useState(false);

  const { appConfig } = useAppUpdateConfig();
  
  const { 
    runningVersionName, 
    runningBuildNumber, 
    isInApp, 
    updateState, 
    setUpdateState,
    progress, 
    setProgress,
    isApkInCache, 
    apkSize 
  } = useAppUpdateNative();

  const { isSecurityMismatch } = useAppUpdateSecurity(isInApp, appConfig);

  const targetApkUrl = useMemo(() => {
    return resolveApkUrl(appConfig?.apkUrl);
  }, [appConfig?.apkUrl]);

  const showOverlay = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('forceUpdate')) return true;
    if (searchParams.has('bypassUpdate') || searchParams.has('ignoreUpdate') || searchParams.has('noUpdate')) return false;
    
    if (!isInApp) return false;
    if (isDismissed) return false;
    if (!appConfig) return false; // Never pop up before Firestore config is fetched
    
    // First check standard version update
    const targetV = appConfig.version || APP_VERSION;
    const targetB = appConfig.buildNumber;
    const currV = runningVersionName || localStorage.getItem('app_version_name') || APP_VERSION;
    const currB = runningBuildNumber || localStorage.getItem('app_version_code');
    const isOlder = isVersionOlder(currV, currB, targetV, targetB);
    
    // If the running version is equal or newer, never show the update overlay
    if (!isOlder) {
      return false;
    }
    
    return true;
  }, [appConfig, runningVersionName, runningBuildNumber, isDismissed, isInApp]);

  const { handleUpdate, handleRestart, startRealDownload } = useAppUpdateActions(
    targetApkUrl,
    isApkInCache,
    setUpdateState,
    setProgress
  );

  return {
    appConfig,
    isDismissed,
    setIsDismissed,
    runningVersionName,
    runningBuildNumber,
    isInApp,
    updateState,
    progress,
    isApkInCache,
    apkSize,
    showOverlay,
    isSecurityMismatch,
    targetApkUrl,
    handleUpdate,
    handleRestart,
    startRealDownload
  };
}
