import React from "react";
import { KeyRound } from "lucide-react";
import { motion } from "framer-motion";
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
      transition={{ duration: 0.3, delay: 0.3 }}
      className="bg-zinc-800/50 rounded-2xl overflow-hidden border border-white/5 mb-3"
    >
      {!isChangingVaultPin ? (
        <button
          onClick={() => setIsChangingVaultPin(true)}
          className="w-full py-3 px-4 hover:bg-white/5 text-white font-medium transition-all flex items-center justify-center gap-2"
        >
          <KeyRound size={18} />
          Alterar Senha do Cofre (Principal)
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
