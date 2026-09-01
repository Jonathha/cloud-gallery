import { useState, useEffect } from 'react';
import { dbPrimary } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { AppConfig } from './types';

export function useAppUpdateConfig() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    const configRef = doc(dbPrimary, 'config', 'app');
    const unsub = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('[AppUpdateCheckOverlay] Config de atualização atualizada no Firestore:', data);
        setAppConfig({
          version: data.version || '2.0',
          buildNumber: data.buildNumber || '200',
          required: data.required !== undefined ? !!data.required : true,
          apkUrl: data.apkUrl || 'https://47ee460c72b6f01c35d72f13ebf8afbf.r2.cloudflarestorage.com/guarly/app.apk',
          securityCode: data.securityCode || ''
        });
      }
    }, (error) => {
      console.warn('[AppUpdateCheckOverlay] Falha ao ler versão no Firestore, usando fallback padrão.', error);
      setAppConfig({
        version: '2.0',
        buildNumber: '200',
        required: true,
        apkUrl: 'https://47ee460c72b6f01c35d72f13ebf8afbf.r2.cloudflarestorage.com/guarly/app.apk',
        securityCode: ''
      });
    });

    return () => unsub();
  }, []);

  return { appConfig };
}
