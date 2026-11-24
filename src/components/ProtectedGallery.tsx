import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useProtectedGallery } from "../hooks/protected/useProtectedGallery";
import ProtectedSetupScreen from "./protected/ProtectedSetupScreen";
import ProtectedUnlockScreen from "./protected/ProtectedUnlockScreen";
import ProtectedHeader from "./protected/ProtectedHeader";
import ProtectedGridContent from "./protected/ProtectedGridContent";
import ProtectedModals from "./protected/ProtectedModals";

export default function ProtectedGallery({ onLightboxToggle }: { onBack?: () => void; onLightboxToggle?: (open: boolean) => void }) {
  const { extraPassword } = useAuth();
  const pg = useProtectedGallery(onLightboxToggle);
  if (!extraPassword) return <ProtectedSetupScreen />;

  return (
    <>
      {!pg.isUnlocked && (
        <div className="absolute inset-0 z-30 bg-[#050505] flex flex-col">
          <ProtectedUnlockScreen passwordInput={pg.passwordInput} setPasswordInput={pg.setPasswordInput} passwordError={pg.passwordError} setPasswordError={pg.setPasswordError} onUnlockSubmit={pg.handleUnlockSubmit} isLoading={pg.isLoading} />
        </div>
      )}
      <ProtectedHeader count={pg.images.length} />
      <main className="max-w-7xl mx-auto p-[2px] sm:p-3 pb-28 sm:pb-32 w-full flex-1 overflow-y-auto scrollbar-thin">
        <ProtectedGridContent pg={pg} extraPassword={extraPassword} />
        <ProtectedModals pg={pg} />
      </main>
    </>
  );
}
