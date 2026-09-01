import React, { useState } from "react";
import { Lock, ShieldCheck, CheckCircle2, AlertTriangle, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { ChangeSecurityPasswordForm } from "./ChangeSecurityPasswordForm";
import { useAuth } from "../../../contexts/AuthContext";

interface SecurityPasswordFormSectionProps {
  isChangingExtraPassword: boolean;
  setIsChangingExtraPassword: (val: boolean) => void;
  extraPassword: string | null;
  securityProps: any;
}

export function SecurityPasswordFormSection({
  isChangingExtraPassword,
  setIsChangingExtraPassword,
  extraPassword,
  securityProps,
}: SecurityPasswordFormSectionProps) {
  const { encryptionMode, switchEncryptionMode } = useAuth();
  const [selectedMode, setSelectedMode] = useState<'standard' | 'custom_extra'>(encryptionMode);
  const [isSwitching, setIsSwitching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleApplyModeChange = async (targetMode: 'standard' | 'custom_extra', newPasswordInput?: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsSwitching(true);
    try {
      if (targetMode === 'standard') {
        await switchEncryptionMode('standard', null);
        setSuccessMsg("Modo de Criptografia alterado para Padrão com sucesso.");
      } else {
        if (!newPasswordInput || newPasswordInput.trim().length < 4) {
          setErrorMsg("A Senha Extra deve ter no mínimo 4 caracteres.");
          setIsSwitching(false);
          return;
        }
        await switchEncryptionMode('custom_extra', newPasswordInput);
        setSuccessMsg("Modo de Proteção Dupla ativado com sucesso!");
      }
      setIsChangingExtraPassword(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro ao alterar modo de criptografia.");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-zinc-800/50 rounded-2xl overflow-hidden border border-white/5 mb-3 p-4 space-y-4"
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-teal-400" />
          <h4 className="text-sm font-semibold text-white">Configuração de Criptografia do Cofre</h4>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
          {extraPassword ? "Proteção Dupla" : "Modo Padrão"}
        </span>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        Escolha o nível de segurança do seu cofre. Você pode alterar entre o Modo Padrão (apenas Senha Mestre) e o Modo Proteção Dupla (com Senha Extra) a qualquer momento.
      </p>

      {/* Selectors for mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => {
            setSelectedMode('standard');
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
            selectedMode === 'standard'
              ? 'bg-white/10 border-white text-white'
              : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:border-white/20'
          }`}
        >
          <ShieldCheck size={18} className={selectedMode === 'standard' ? 'text-emerald-400 shrink-0 mt-0.5' : 'text-zinc-500 shrink-0 mt-0.5'} />
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-white flex items-center gap-1">
              Modo Padrão
              {selectedMode === 'standard' && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">
              Acesso fluido e direto protegido por Senha Mestre.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMode('custom_extra');
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
            selectedMode === 'custom_extra'
              ? 'bg-white/10 border-white text-white'
              : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:border-white/20'
          }`}
        >
          <Lock size={18} className={selectedMode === 'custom_extra' ? 'text-teal-400 shrink-0 mt-0.5' : 'text-zinc-500 shrink-0 mt-0.5'} />
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-white flex items-center gap-1">
              Proteção Dupla
              {selectedMode === 'custom_extra' && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">
              Exige Senha Extra para fotos ocultas/ações de segurança.
            </p>
          </div>
        </button>
      </div>

      {errorMsg && (
        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-center">
          {errorMsg}
        </p>
      )}

      {successMsg && (
        <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center">
          {successMsg}
        </p>
      )}

      {/* Action panel depending on selection vs current state */}
      {selectedMode === 'standard' && extraPassword && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-medium">
            <AlertTriangle size={16} className="shrink-0" />
            Remover Senha Extra e mudar para Modo Padrão?
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Sua senha extra atual será desativada. O cofre passará a usar apenas a Senha Mestre para criptografia.
          </p>
          <button
            type="button"
            disabled={isSwitching}
            onClick={() => handleApplyModeChange('standard')}
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-all cursor-pointer"
          >
            {isSwitching ? "Atualizando..." : "Confirmar Mudança para Modo Padrão"}
          </button>
        </div>
      )}

      {selectedMode === 'custom_extra' && (
        <div className="pt-2">
          {!isChangingExtraPassword ? (
            <button
              onClick={() => setIsChangingExtraPassword(true)}
              className="w-full py-2.5 px-4 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-200 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock size={16} />
              {extraPassword ? "Alterar Senha Extra Existente" : "Definir Senha Extra de Segurança"}
            </button>
          ) : (
            <ChangeSecurityPasswordForm
              {...securityProps}
              extraPassword={extraPassword}
              onCancel={() => {
                setIsChangingExtraPassword(false);
                securityProps.setCurrentExtraPassword("");
                securityProps.setNewExtraPasswordState("");
                securityProps.setConfirmNewExtraPassword("");
              }}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}

