import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { registerSW } from 'virtual:pwa-register';
import { initAppBridge } from './utils/appBridgeInit';
import { initTheme } from './utils/theme';
import { isNativeApp } from './utils/isNativeApp';
import { authPrimary } from './firebase';

// Inicializa o tema salvo (padrão preto ou claro)
initTheme();

// Sincroniza o estado de privacidade com o app hospedeiro no boot
initAppBridge();

// Interceptor global do fetch para capturar solicitações de reCAPTCHA obrigatórias do backend e injetar tokens de autenticação
const originalFetch = window.fetch;
Object.defineProperty(window, 'fetch', {
  value: async (...args: any[]) => {
    try {
      let [input, init] = args;
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input && typeof input === "object" && "url" in input) {
        url = (input as any).url;
      }

      if (url.includes("/api/storage") || url.includes("/api/chat") || url.includes("/api/guarly/chat")) {
        const currentUser = authPrimary.currentUser;
        if (currentUser) {
          try {
            const token = await currentUser.getIdToken();
            init = init || {};
            init.headers = init.headers || {};
            if (init.headers instanceof Headers) {
              init.headers.set("Authorization", `Bearer ${token}`);
            } else if (Array.isArray(init.headers)) {
              const authIdx = init.headers.findIndex(h => h[0].toLowerCase() === "authorization");
              if (authIdx !== -1) {
                init.headers[authIdx][1] = `Bearer ${token}`;
              } else {
                init.headers.push(["Authorization", `Bearer ${token}`]);
              }
            } else {
              init.headers = {
                ...init.headers,
                "Authorization": `Bearer ${token}`
              };
            }
            args[1] = init;
          } catch (e) {
            console.warn("Failed to attach Firebase auth token to fetch:", e);
          }
        }
      }

      const response = await originalFetch(...(args as [RequestInfo, RequestInit]));
      if (response.status === 403) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          if (data && data.error === "reCAPTCHA_required") {
            window.dispatchEvent(new CustomEvent("trigger-recaptcha-verification"));
          }
        } catch (e) {
          // Silencioso em caso de erro no parse do JSON
        }
      }
      return response;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  writable: true,
  configurable: true
});

// Register PWA Service Worker only on standard web browsers
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  if (isNativeApp()) {
    // Unregister any active service worker inside the WebView
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  } else {
    registerSW({ immediate: true });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
