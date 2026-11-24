import { notifyAppPrivacyMode } from './appBridge';

// Chama assim que o app carrega para sincronizar o estado com o Guarly
export const initAppBridge = () => {
  let privacyMode = false;
  try {
    privacyMode = localStorage.getItem('privacyMode') === 'true';
  } catch (e) {}
  notifyAppPrivacyMode(privacyMode);
};
