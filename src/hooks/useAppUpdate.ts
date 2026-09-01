import { useState, useMemo } from 'react';
import { isVersionOlder } from '../utils/versionCheck';
import { getApiUrl } from '../utils/apiUrl';
import { useAppUpdateConfig } from './appUpdate/useAppUpdateConfig';
import { useAppUpdateSecurity } from './appUpdate/useAppUpdateSecurity';
import { useAppUpdateNative } from './appUpdate/useAppUpdateNative';
import { useAppUpdateActions } from './appUpdate/useAppUpdateActions';
import type { AppConfig } from './appUpdate/types';

export type { AppConfig };

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
    return getApiUrl('/api/update/download');
  }, []);

  const showOverlay = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('forceUpdate')) return true;
    if (searchParams.has('bypassUpdate') || searchParams.has('ignoreUpdate') || searchParams.has('noUpdate')) return false;
    
    if (!isInApp) return false;
    if (isDismissed) return false;
    
    // First check standard version update
    const targetV = appConfig?.version || '2.0';
    const targetB = appConfig?.buildNumber || '200';
    const currV = runningVersionName || localStorage.getItem('app_version_name') || '1.0';
    const currB = runningBuildNumber || localStorage.getItem('app_version_code') || '100';
    const isOlder = isVersionOlder(currV, currB, targetV, targetB);
    if (isOlder) return true;
    
    // Second check security verification code mismatch
    if (isSecurityMismatch) return true;
    return false;
  }, [appConfig, runningVersionName, runningBuildNumber, isDismissed, isInApp, isSecurityMismatch]);

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
