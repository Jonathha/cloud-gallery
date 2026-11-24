import React from 'react';
import { VaultEncryptionMode } from './types';
import { VaultSetupModeOption } from './VaultSetupModeOption';
import { VaultSetupExtraPasswordFields } from './VaultSetupExtraPasswordFields';

interface VaultSetupModeSectionProps {
  mode: VaultEncryptionMode;
  setMode: (mode: VaultEncryptionMode) => void;
  extraPassword: string;
  setExtraPassword: (val: string) => void;
  confirmExtraPassword: string;
  setConfirmExtraPassword: (val: string) => void;
  showExtra: boolean;
  setShowExtra: (val: boolean) => void;
  showConfirmExtra: boolean;
  setShowConfirmExtra: (val: boolean) => void;
  loading: boolean;
}

export const VaultSetupModeSection: React.FC<VaultSetupModeSectionProps> = ({
  mode, setMode, extraPassword, setExtraPassword,
  confirmExtraPassword, setConfirmExtraPassword,
  showExtra, setShowExtra, showConfirmExtra, setShowConfirmExtra, loading
}) => {
  return (
    <div className="space-y-3 bg-zinc-900/40 p-4 border border-white/5 rounded-2xl">
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
        2. Modo de Proteção de Criptografia
      </h3>
      <VaultSetupModeOption mode={mode} setMode={setMode} />
      {mode === 'custom_extra' && (
        <VaultSetupExtraPasswordFields
          extraPassword={extraPassword} setExtraPassword={setExtraPassword}
          confirmExtraPassword={confirmExtraPassword} setConfirmExtraPassword={setConfirmExtraPassword}
          showExtra={showExtra} setShowExtra={setShowExtra}
          showConfirmExtra={showConfirmExtra} setShowConfirmExtra={setShowConfirmExtra}
          loading={loading}
        />
      )}
    </div>
  );
};
