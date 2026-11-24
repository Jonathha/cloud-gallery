import React from "react";
import { KeyRound, ShieldAlert, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { ChangeAccountPasswordForm } from "./ChangeAccountPasswordForm";

interface AccountPasswordFormSectionProps {
  canUnlink: boolean;
  isChangingPassword: boolean;
  setIsChangingPassword: (val: boolean) => void;
  passwordProps: any;
  onUnlink: () => void;
  isUnlinking: boolean;
}

export function AccountPasswordFormSection({
  canUnlink,
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
      transition={{ duration: 0.25 }}
      className="bg-zinc-900/40 rounded-2xl overflow-hidden border border-white/10"
    >
      <div className="p-3 bg-white/5 border-b border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <KeyRound size={15} className="text-blue-400" />
          <span className="text-zinc-200 font-medium">Acesso por e-mail e senha habilitado</span>
        </div>
        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Ativo</span>
      </div>

      {!isChangingPassword ? (
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          <button
            type="button"
            onClick={() => setIsChangingPassword(true)}
            className="flex-1 py-3.5 px-4 hover:bg-white/5 active:bg-white/10 text-white font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
          >
            <KeyRound size={16} className="text-blue-400" />
            <span>Alterar Senha da Conta</span>
          </button>
          {canUnlink ? (
            <button
              type="button"
              onClick={onUnlink}
              disabled={isUnlinking}
              className="flex-1 py-3.5 px-4 hover:bg-white/5 active:bg-white/10 text-zinc-400 hover:text-white font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
            >
              {isUnlinking ? (
                <Loader2 className="animate-spin text-zinc-400" size={16} />
              ) : (
                <ShieldAlert size={16} className="text-zinc-500" />
              )}
              <span>Desativar Acesso por Senha</span>
            </button>
          ) : (
            <div className="flex-1 py-3.5 px-4 text-zinc-500 flex items-center justify-center gap-2 text-xs text-center select-none">
              <ShieldAlert size={15} className="text-zinc-500 shrink-0" />
              <span>Método de login exclusivo</span>
            </div>
          )}
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
