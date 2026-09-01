/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface AndroidBridge {
  getPendingToken?: () => string | null;
  clearPendingToken?: () => void;
  hideSystemUI?: () => void;
  showSystemUI?: () => void;
  onPrivateModeClicked?: () => void;
  onTabChanged?: (tabName: string) => void;
  startUpdate?: () => void;
  checkIfApkExists?: (fileName: string) => boolean;
  isApkCached?: () => boolean;
  installCachedApk?: (fileName: string) => void;
  installFromMemory?: () => void;
  deleteCachedApk?: (fileName: string) => void;
  deleteFromMemory?: () => void;
  requestNotificationPermission?: () => void;
  showNotification?: (title: string, message: string) => void;
  startBackgroundChatListener?: (userId: string) => void;
  stopBackgroundChatListener?: () => void;
}

interface Window {
  receiveTokenFromAndroid?: (idToken: string) => Promise<void>;
  checkPendingToken?: () => Promise<void>;
  AndroidBridge?: AndroidBridge;
  GuarlyApp?: AndroidBridge;
  GuarlyNativeBridge?: AndroidBridge;
  setAppVersion?: (version: string, code?: number) => void;
  updateAppVersion?: (version: string, code?: number) => void;
  setNativeAppVersion?: (version: string, code?: number) => void;
  onAppVersionReceived?: (version: string, code?: number) => void;
  onDownloadProgress?: (p: number) => void;
  updateDownloadProgress?: (p: number) => void;
  setDownloadProgress?: (p: number) => void;
  onApkStatusReceived?: (exists: boolean, size?: string) => void;
}
