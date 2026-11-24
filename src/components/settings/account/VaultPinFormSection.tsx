import React from "react";
import { KeyRound } from "lucide-react";
import { motion } from "motion/react";
import { ChangeVaultPinForm } from "./ChangeVaultPinForm";

interface VaultPinFormSectionProps {
  isChangingVaultPin: boolean;
  setIsChangingVaultPin: (val: boolean) => void;
  vaultProps: any;
}

export function VaultPinFormSection({
  isChangingVaultPin,
  setIsChangingVaultPin,
  vaultProps,
}: VaultPinFormSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-zinc-900/40 rounded-2xl overflow-hidden border border-white/10"
    >
      {!isChangingVaultPin ? (
        <button
          type="button"
          onClick={() => setIsChangingVaultPin(true)}
          className="w-full py-3.5 px-4 hover:bg-white/5 active:bg-white/10 text-white font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
        >
          <KeyRound size={16} className="text-blue-400" />
          <span>Alterar Senha do Cofre (Principal)</span>
        </button>
      ) : (
        <ChangeVaultPinForm
          {...vaultProps}
          onCancel={() => {
            setIsChangingVaultPin(false);
            vaultProps.setCurrentVaultPin("");
            vaultProps.setNewVaultPin("");
            vaultProps.setConfirmNewVaultPin("");
          }}
        />
      )}
    </motion.div>
  );
}
