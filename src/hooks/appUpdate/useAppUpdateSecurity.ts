import { useState, useEffect, useMemo, useRef } from 'react';
import { AppConfig } from './types';

export function useAppUpdateSecurity(isInApp: boolean, appConfig: AppConfig | null) {
  const [receivedSecurityCode, setReceivedSecurityCode] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('received_app_security_code') : null;
  });
  const [isVerificationGracePeriodActive, setIsVerificationGracePeriodActive] = useState(true);
  const lastLoggedCodeRef = useRef<string | null>(null);

  // Grace period to allow WebView app to inject the security code
  useEffect(() => {
    if (isInApp) {
      const timer = setTimeout(() => {
        setIsVerificationGracePeriodActive(false);
      }, 2000); // 2 seconds grace period to receive the security code from the app
      return () => clearTimeout(timer);
    } else {
      setIsVerificationGracePeriodActive(false);
    }
  }, [isInApp]);

  // Listen to the native App Security Code bridge
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as any;

    win.receiveAppSecurityCode = (code: string) => {
      if (code) {
        if (lastLoggedCodeRef.current !== code) {
          lastLoggedCodeRef.current = code;
          console.log('[AppUpdateCheckOverlay] Código de segurança recebido do APK:', code);
        }
        localStorage.setItem('received_app_security_code', code);
        setReceivedSecurityCode(code);
      }
    };
    win.registerAppSecurityCode = win.receiveAppSecurityCode;

    // Check query params just in case it was passed as URL parameter
    const searchParams = new URLSearchParams(window.location.search);
    const urlCode = searchParams.get('appCode') || searchParams.get('securityCode') || searchParams.get('code');
    if (urlCode) {
      if (lastLoggedCodeRef.current !== urlCode) {
        lastLoggedCodeRef.current = urlCode;
        console.log('[AppUpdateCheckOverlay] Código de segurança recebido via URL:', urlCode);
      }
      localStorage.setItem('received_app_security_code', urlCode);
      setReceivedSecurityCode(urlCode);
    }

    return () => {
      delete win.receiveAppSecurityCode;
      delete win.registerAppSecurityCode;
    };
  }, []);

  // Compute if there's an active security code mismatch
  const isSecurityMismatch = useMemo(() => {
    if (!isInApp) return false;
    const requiredCode = appConfig?.securityCode;
    if (!requiredCode || requiredCode.trim() === '') return false;
    
    const currentCode = receivedSecurityCode || (typeof window !== 'undefined' ? localStorage.getItem('received_app_security_code') : null);
    if (currentCode === requiredCode) {
      if (typeof window !== 'undefined' && localStorage.getItem('received_app_security_code') !== currentCode) {
        localStorage.setItem('received_app_security_code', currentCode);
      }
      return false;
    }
    
    if (isVerificationGracePeriodActive) {
      // If we got a code and it is already explicitly incorrect, fail immediately
      if (currentCode && currentCode !== requiredCode) {
        return true;
      }
      return false;
    }
    
    return true; // Grace period expired, no valid code received
  }, [appConfig, receivedSecurityCode, isInApp, isVerificationGracePeriodActive]);

  return { isSecurityMismatch, receivedSecurityCode };
}
