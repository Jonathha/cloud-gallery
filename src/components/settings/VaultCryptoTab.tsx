import React from 'react';
import { motion } from 'motion/react';
import { KeyRound, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAccountSettingsLogic } from '../../hooks/settings/useAccountSettingsLogic';
import { SecurityPasswordFormSection } from './account/SecurityPasswordFormSection';
import { VaultPinFormSection } from './account/VaultPinFormSection';

interface VaultCryptoTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onClose?: () => void;
}

export default function VaultCryptoTab({ showToast, onClose }: VaultCryptoTabProps) {
  const auth = useAuth();
  const accSettings = useAccountSettingsLogic({
    showToast,
    onClose,
    extraPassword: auth.extraPassword,
    cryptoKey: auth.cryptoKey,
    lockVault: auth.lockVault,
    updateExtraPassword: auth.updateExtraPassword,
    changeVaultPin: auth.changeVaultPin,
    registerFailedAttempt: auth.registerFailedAttempt,
    resetFailedAttempts: auth.resetFailedAttempts,
  });

  return (
    <div className="space-y-6 select-none">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-1.5"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
            <KeyRound size={20} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Criptografia do Cofre
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Gerencie a Senha Mestre de desbloqueio e o nível de proteção criptográfica local.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Cartão de Resumo Informativo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900/60 to-zinc-950/80 border border-white/10 flex items-start gap-3.5 shadow-sm"
      >
        <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-300 shrink-0 mt-0.5">
          <ShieldCheck size={18} className="text-blue-400" />
        </div>
        <div className="space-y-1 text-xs">
          <p className="text-zinc-200 font-semibold">
            Criptografia de Ponta a Ponta (AES-GCM 256 bits)
          </p>
          <p className="text-zinc-400 leading-relaxed">
            Seus arquivos são criptografados diretamente no seu dispositivo antes de qualquer envio. Apenas quem possui sua Senha Mestre consegue derivar as chaves de descriptografia.
          </p>
        </div>
      </motion.div>

      {/* Seção 1: Senha Mestre do Cofre (PIN) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="space-y-2.5"
      >
        <div className="px-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Senha Principal de Acesso
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">
            PIN Obrigatório
          </span>
        </div>

        <VaultPinFormSection
          isChangingVaultPin={accSettings.isChangingVaultPin}
          setIsChangingVaultPin={accSettings.setIsChangingVaultPin}
          vaultProps={accSettings}
        />
      </motion.div>

      {/* Seção 2: Modo de Criptografia & Senha Extra */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="space-y-2.5"
      >
        <div className="px-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Nível de Isolamento Criptográfico
          </span>
          <span className="text-[11px] text-blue-400 font-semibold flex items-center gap-1">
            <Lock size={12} />
            {auth.extraPassword ? 'Proteção Dupla Ativa' : 'Modo Padrão'}
          </span>
        </div>

        <SecurityPasswordFormSection
          isChangingExtraPassword={accSettings.isChangingExtraPassword}
          setIsChangingExtraPassword={accSettings.setIsChangingExtraPassword}
          extraPassword={auth.extraPassword}
          securityProps={accSettings}
        />
      </motion.div>
    </div>
  );
}
