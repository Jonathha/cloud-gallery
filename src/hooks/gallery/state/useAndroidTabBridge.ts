import { useEffect } from "react";

export function useAndroidTabBridge(activeTab: string, showProtectedContext: boolean, setShowProtectedContext: (v: boolean) => void, setActiveTab: (v: any) => void) {
  useEffect(() => {
    setShowProtectedContext(activeTab === 'protected');
    if (typeof window !== "undefined" && window.AndroidBridge) {
      if (typeof window.AndroidBridge.onTabChanged === "function") try { window.AndroidBridge.onTabChanged(activeTab); } catch {}
      if (activeTab === 'protected' && typeof window.AndroidBridge.onPrivateModeClicked === "function") try { window.AndroidBridge.onPrivateModeClicked(); } catch {}
    }
  }, [activeTab, setShowProtectedContext]);

  useEffect(() => { if (showProtectedContext) setActiveTab('protected'); }, [showProtectedContext, setActiveTab]);
}
