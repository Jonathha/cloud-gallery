import { useMemo } from 'react';
import { UpdateState } from './types';

export function useAppUpdateActions(
  targetApkUrl: string,
  isApkInCache: boolean,
  setUpdateState: (s: UpdateState) => void,
  setProgress: (p: number) => void
) {
  const triggerDirectDownload = (url: string = targetApkUrl, fileName: string = 'app.apk') => {
    setUpdateState('installing');
    setProgress(100);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 300);
  };

  const startRealDownload = async () => {
    setUpdateState('downloading');
    setProgress(0);
    const downloadUrl = targetApkUrl;
    const fileName = 'app.apk';
    const xhr = new XMLHttpRequest();
    const separator = downloadUrl.includes('?') ? '&' : '?';
    
    xhr.open('GET', `${downloadUrl}${separator}t=${Date.now()}`, true);
    xhr.responseType = 'blob';
    
    xhr.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setProgress(percentComplete);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        setProgress(100);
        setUpdateState('installing');
        const blob = xhr.response;
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        const win = window as any;
        const completeMsg = { type: 'DOWNLOAD_COMPLETE', url: blobUrl };
        if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
          win.ReactNativeWebView.postMessage(JSON.stringify(completeMsg));
        }
        if (win.GuarlyApp && typeof win.GuarlyApp.onDownloadComplete === 'function') {
          win.GuarlyApp.onDownloadComplete(blobUrl);
        }
      } else {
        triggerDirectDownload(downloadUrl, fileName);
      }
    };
    
    xhr.onerror = () => {
      triggerDirectDownload(downloadUrl, fileName);
    };
    
    xhr.send();
  };

  const handleUpdate = async () => {
    const win = window as any;
    if (isApkInCache) {
      const installMsg = { type: 'INSTALL_CACHED_APK', fileName: 'app-release.apk' };
      const installMsgStr = JSON.stringify(installMsg);
      if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
        win.ReactNativeWebView.postMessage(installMsgStr);
      }
      if (win.AndroidBridge) {
        if (typeof win.AndroidBridge.installCachedApk === 'function') {
          win.AndroidBridge.installCachedApk('app-release.apk');
        } else if (typeof win.AndroidBridge.installFromMemory === 'function') {
          win.AndroidBridge.installFromMemory();
        }
      }
      win.parent.postMessage(installMsg, '*');
      setUpdateState('installing');
      setProgress(100);
      return;
    }

    setUpdateState('downloading');
    setProgress(0);
    const downloadUrl = targetApkUrl;
    
    const updateMsg = { type: 'START_UPDATE', url: downloadUrl };
    const updateMsgStr = JSON.stringify(updateMsg);
    if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
      win.ReactNativeWebView.postMessage(updateMsgStr);
    }
    
    if (win.GuarlyApp && typeof win.GuarlyApp.startUpdate === 'function') {
      try {
        win.GuarlyApp.startUpdate(downloadUrl);
      } catch (e) {
        win.GuarlyApp.startUpdate();
      }
    }
    if (win.AndroidBridge && typeof win.AndroidBridge.startUpdate === 'function') {
      try {
        win.AndroidBridge.startUpdate(downloadUrl);
      } catch (e) {
        win.AndroidBridge.startUpdate();
      }
    }
    win.parent.postMessage(updateMsg, '*');
    startRealDownload();
  };

  const handleRestart = () => {
    window.location.reload();
  };

  return { handleUpdate, handleRestart, startRealDownload };
}
