import React from "react";

export function useGalleryViewEvents(g: any) {
  React.useEffect(() => {
    const handleNavigate = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (tab.startsWith('settings-')) {
        g.setSettingsSubTab(tab.split('settings-')[1] as any);
        g.setActiveTab('settings');
      } else {
        g.setActiveTab(tab);
      }
    };
    window.addEventListener('guarly_navigate_tab', handleNavigate);
    return () => window.removeEventListener('guarly_navigate_tab', handleNavigate);
  }, [g.setActiveTab, g.setSettingsSubTab]);

  React.useEffect(() => {
    const handleFcm = (e: Event) => {
      // FCM token handled silently in background
    };
    window.addEventListener("fcm_token_received", handleFcm);
    return () => window.removeEventListener("fcm_token_received", handleFcm);
  }, [g]);
}
