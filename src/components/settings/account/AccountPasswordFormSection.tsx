import React from "react";
import { KeyRound, ShieldAlert, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { ChangeAccountPasswordForm } from "./ChangeAccountPasswordForm";

interface AccountPasswordFormSectionProps {
  isChangingPassword: boolean;
  setIsChangingPassword: (val: boolean) => void;
  passwordProps: any;
  onUnlink: () => void;
  isUnlinking: boolean;
}

export function AccountPasswordFormSection({
  isChangingPassword,
  setIsChangingPassword,
  passwordProps,
  onUnlink,
  isUnlinking,
}: AccountPasswordFormSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-zinc-800/50 rounded-2xl overflow-hidden border border-white/5 mb-3"
    >
      {!isChangingPassword ? (
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/5">
          <button
            onClick={() => setIsChangingPassword(true)}
            className="flex-1 py-3.5 px-4 hover:bg-white/5 text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <KeyRound size={16} />
            Alterar Senha da Conta
          </button>
          <button
            onClick={onUnlink}
            disabled={isUnlinking}
            className="flex-1 py-3.5 px-4 hover:bg-white/5 text-zinc-400 hover:text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
          >
            {isUnlinking ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <ShieldAlert size={16} />
            )}
            Desativar Acesso por Senha
          </button>
        </div>
      ) : (
        <ChangeAccountPasswordForm
          {...passwordProps}
          onCancel={() => {
            setIsChangingPassword(false);
            passwordProps.setCurrentPassword("");
            passwordProps.setNewPassword("");
            passwordProps.setConfirmPassword("");
          }}
        />
      )}
    </motion.div>
  );
}
