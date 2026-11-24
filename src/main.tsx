import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { registerSW } from 'virtual:pwa-register';
import { initAppBridge } from './utils/appBridgeInit';
import { initTheme } from './utils/theme';
import { isNativeApp } from './utils/isNativeApp';

// Inicializa o tema salvo (padrão preto ou claro)
initTheme();

// Sincroniza o estado de privacidade com o app hospedeiro no boot
initAppBridge();

// Register PWA Service Worker only on standard web browsers
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  try {
    if (isNativeApp()) {
      // Unregister any active service worker inside the WebView
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      }).catch(() => {});
    } else {
      registerSW({ immediate: true });
    }
  } catch (swErr) {
    console.warn('[PWA] ServiceWorker setup warning:', swErr);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
