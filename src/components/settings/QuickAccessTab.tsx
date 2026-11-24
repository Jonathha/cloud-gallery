import React from "react";
import { useQuickAccessLogic } from "./quickAccess/useQuickAccessLogic";
import { QuickAccessHeaderCard } from "./quickAccess/QuickAccessHeaderCard";
import { QuickAccessActiveView } from "./quickAccess/QuickAccessActiveView";
import { QuickAccessFormView } from "./quickAccess/QuickAccessFormView";

interface QuickAccessTabProps {
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export default function QuickAccessTab({ showToast }: QuickAccessTabProps) {
  const logic = useQuickAccessLogic({ showToast });

  if (logic.blocked) return null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 text-left pb-2">
      <QuickAccessHeaderCard isEnabled={logic.isEnabled} />

      {logic.isEnabled ? (
        <QuickAccessActiveView loading={logic.loading} handleDisable={logic.handleDisable} />
      ) : (
        <QuickAccessFormView
          pin={logic.pin}
          setPin={logic.setPin}
          showPin={logic.showPin}
          setShowPin={logic.setShowPin}
          loading={logic.loading}
          error={logic.error}
          setError={logic.setError}
          handleEnable={logic.handleEnable}
        />
      )}
    </div>
  );
}
