import { useEffect, useRef } from 'react';
import { getApiUrl } from '../utils/apiUrl';

export function useWebAutoUpdate() {
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    const checkServerVersion = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const response = await fetch(getApiUrl('/api/version'), {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (response.ok) {
          const data = await response.json();
          const serverBuildTimestamp = data?.buildTimestamp;

          if (serverBuildTimestamp !== undefined && serverBuildTimestamp !== null) {
            const serverBuildTimestampStr = String(serverBuildTimestamp);
            const localBuildTimestamp = localStorage.getItem('cg_web_build_timestamp');

            if (!localBuildTimestamp) {
              localStorage.setItem('cg_web_build_timestamp', serverBuildTimestampStr);
            } else if (localBuildTimestamp !== serverBuildTimestampStr) {
              console.log('[WebAutoUpdate] Detectada nova versão do site! Atualizando...');
              
              // Clear caches & unregister service workers before forcing page refresh
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                  await reg.unregister();
                }
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                for (const key of keys) {
                  await caches.delete(key);
                }
              }

              localStorage.setItem('cg_web_build_timestamp', serverBuildTimestampStr);
              window.location.reload();
            }
          }
        }
      } catch (err) {
        console.warn('[WebAutoUpdate] Falha ao verificar versão no servidor:', err);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Initial check on mount
    checkServerVersion();

    // Periodic check every 30 seconds
    const interval = setInterval(checkServerVersion, 30000);

    // Check on tab focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkServerVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
