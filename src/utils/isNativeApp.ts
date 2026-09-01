export const isNativeApp = () => {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  const ua = navigator.userAgent || '';
  
  // Detecta WebView do Android especificamente do nosso app
  const isAndroidWebView = 
    /GuarlyApp/i.test(ua);
  
  // Detecta WebView do iOS do nosso app (caso configurem UA similar)
  const isIosWebView = /GuarlyApp/i.test(ua) || (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua) && (win.webkit && win.webkit.messageHandlers && win.webkit.messageHandlers.guarlyApp));

  // Fallback via URL parameters caso a webview não tenha um User-Agent distinto
  const searchParams = new URLSearchParams(window.location.search);
  const isAppUrlParam = searchParams.has('app') || searchParams.has('webview') || searchParams.has('native');

  return !!(
    win.ReactNativeWebView ||
    win.GuarlyApp ||
    win.GuarlyNativeBridge ||
    (win.webkit && win.webkit.messageHandlers && win.webkit.messageHandlers.guarlyApp) ||
    win.AndroidBridge ||
    win.Android ||
    win.appVersion ||
    win.appBuildNumber ||
    isAndroidWebView ||
    isIosWebView ||
    isAppUrlParam
  );
};

export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallScreen = window.innerWidth < 1024;
  return isMobileUA || isTouch || isSmallScreen;
};

