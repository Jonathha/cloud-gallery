import { useState, useEffect } from 'react';
import { AppConfig } from './types';
import { resolveApkUrl } from '../../utils/apkUrl';
import { APP_VERSION } from '../../constants';
import { fetchAppConfigApi } from '../../services/vaultApiService';

export function useAppUpdateConfig() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      try {
        const data = await fetchAppConfigApi();
        if (data && isMounted) {
          setAppConfig({
            version: data.version || APP_VERSION,
            buildNumber: data.buildNumber || '',
            required: data.required !== undefined ? !!data.required : false,
            apkUrl: resolveApkUrl(data.apkUrl),
            securityCode: data.securityCode || ''
          });
        }
      } catch (e) {
        console.warn('[AppUpdateCheckOverlay] Falha ao ler versão no D1.', e);
      }
    }

    loadConfig();
    const interval = setInterval(loadConfig, 60000); // Check once per minute

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { appConfig };
}
