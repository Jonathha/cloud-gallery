export const notifyAppPrivacyMode = (isActive: boolean) => {
  const message = { type: 'PRIVACY_MODE_CHANGED', isActive };
  const messageStr = JSON.stringify(message);
  
  const win = window as any;

  // Tenta enviar para React Native WebView
  if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
    win.ReactNativeWebView.postMessage(messageStr);
  }
  
  // Tenta enviar para interface Android nativa (ex: addJavascriptInterface)
  if (win.GuarlyApp && typeof win.GuarlyApp.onPrivacyModeChanged === 'function') {
    win.GuarlyApp.onPrivacyModeChanged(isActive);
  }

  // Tenta enviar para iOS WKWebView
  if (win.webkit && win.webkit.messageHandlers && win.webkit.messageHandlers.guarlyApp) {
    win.webkit.messageHandlers.guarlyApp.postMessage(message);
  }

  // Fallback padrão para iframes ou outras webviews baseadas em window
  win.parent.postMessage(message, '*');
};

export const notifyAppSystemUI = (show: boolean) => {
  const message = { type: 'SYSTEM_UI_CHANGED', show };
  const messageStr = JSON.stringify(message);
  
  const win = window as any;

  // React Native WebView
  if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
    win.ReactNativeWebView.postMessage(messageStr);
  }
  
  // Interface Android nativa
  if (win.GuarlyApp && typeof win.GuarlyApp.onSystemUIChanged === 'function') {
    win.GuarlyApp.onSystemUIChanged(show);
  }

  // iOS WKWebView
  if (win.webkit && win.webkit.messageHandlers && win.webkit.messageHandlers.guarlyApp) {
    win.webkit.messageHandlers.guarlyApp.postMessage(message);
  }

  // AndroidBridge legado
  if (win.AndroidBridge) {
    if (show && typeof win.AndroidBridge.showSystemUI === 'function') {
      win.AndroidBridge.showSystemUI();
    } else if (!show && typeof win.AndroidBridge.hideSystemUI === 'function') {
      win.AndroidBridge.hideSystemUI();
    }
  }

  win.parent.postMessage(message, '*');
};

export const sendNativeNotification = (title: string, message: string) => {
  console.log("[AppBridge] Push notifications completely deactivated:", { title, message });
};

export const requestNativeNotificationPermission = async (userId: string) => {
  const win = window as any;
  if (win.AndroidBridge && typeof win.AndroidBridge.requestNotificationPermission === 'function') {
    win.AndroidBridge.requestNotificationPermission();
  } else if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
    win.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_NOTIFICATION_PERMISSION' }));
  } else {
    // Request Web Push Notification Permission
    try {
      if (win.isWebViewFCMEnabled) {
         console.log("Guarly: Skipping Web Push registration because WebView token handling is enabled.");
         return;
      }
      
      if ('Notification' in window && 'serviceWorker' in navigator) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          // Generate FCM Web Token
          const { getToken } = await import('firebase/messaging');
          const { messagingChat } = await import('../firebase');
          const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
          const { dbChat } = await import('../firebase');

          if (messagingChat) {
            // Need a VAPID key to get token on web, using a fallback or getting it from env
            const currentToken = await getToken(messagingChat, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BDzWl333iS6g9oXy7w62s78Gj79Tq489Qo90iJp4O3H2t6Y' }).catch(() => null);
            if (currentToken) {
              if (userId) {
                await setDoc(doc(dbChat, "user_fcm_tokens", userId), {
                  token: currentToken,
                  userId: userId,
                  updatedAt: serverTimestamp()
                }, { merge: true });
                console.log("Web FCM Token saved for user:", userId);
              }
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          }
        }
      }
    } catch (e) {
      console.error('Error requesting web notification permission:', e);
    }
  }
};

export const startNativeBackgroundChatListener = (userId: string) => {
};

export const stopNativeBackgroundChatListener = () => {
};
