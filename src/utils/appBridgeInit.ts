import { notifyAppPrivacyMode } from './appBridge';

// Chama assim que o app carrega para sincronizar o estado com o Guarly
export const initAppBridge = () => {
  const privacyMode = localStorage.getItem('privacyMode') === 'true';
  notifyAppPrivacyMode(privacyMode);
};
