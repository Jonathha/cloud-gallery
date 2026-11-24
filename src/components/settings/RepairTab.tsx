import React from 'react';
import { motion } from 'motion/react';
import { Wrench, RotateCcw, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { clearImageCache } from '../../utils/db';

interface RepairTabProps {
  clearing: boolean;
  setClearing: (val: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function RepairTab({
  clearing,
  setClearing,
  showToast
}: RepairTabProps) {
  const handleDeepRepair = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      await clearImageCache();
      showToast('Cache limpo! Reiniciando...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      showToast('Erro ao reparar cofre', 'error');
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 text-left select-none pb-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-1.5"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
            <Wrench size={20} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Reparar Cofre
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Restaure a integridade local e ressincronize suas mídias com a nuvem.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="p-4 sm:p-5 bg-zinc-900/50 border border-white/10 rounded-2xl space-y-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-white/5 text-zinc-200 rounded-xl border border-white/10 shrink-0 mt-0.5">
            <RotateCcw size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-sm sm:text-base">
              Reparação Profunda
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
              Se algumas imagens não estão carregando ou aparecem com erro, esta função limpa o cache local e força uma nova sincronização com a nuvem.
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            O aplicativo será reiniciado após a limpeza para garantir que todos os dados sejam atualizados corretamente.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDeepRepair}
          disabled={clearing}
          className="w-full py-3 px-4 bg-white hover:bg-zinc-200 active:scale-[0.98] text-black text-sm font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Reparando...</span>
            </>
          ) : (
            <>
              <Wrench size={16} />
              <span>Iniciar Reparação</span>
            </>
          )}
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="p-4 rounded-2xl bg-zinc-900/40 border border-white/10 flex items-start gap-3.5"
      >
        <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-blue-400 shrink-0 mt-0.5">
          <ShieldCheck size={18} />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="text-zinc-200 font-semibold">
            Dica de Segurança
          </h4>
          <p className="text-zinc-400 leading-relaxed">
            Suas fotos estão seguras na nuvem. A reparação apenas limpa a cópia local que pode ter sido corrompida por falhas de conexão ou armazenamento do dispositivo.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

