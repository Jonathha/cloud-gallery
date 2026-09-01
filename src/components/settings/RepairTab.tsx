import React from 'react';
import { Wrench, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
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
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/10 rounded-xl text-white">
            <Wrench size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">Reparar Cofre</h3>
        </div>

        <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 text-white rounded-2xl border border-white/5">
              <RotateCcw size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-lg">Reparação Profunda</h4>
              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                Se algumas imagens não estão carregando ou aparecem com erro, esta função irá limpar o cache local e forçar uma nova sincronização com a nuvem.
              </p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
            <AlertTriangle size={20} className="text-amber-500 shrink-0" />
            <p className="text-xs text-amber-200/70 leading-relaxed">
              O aplicativo será reiniciado após a limpeza para garantir que todos os dados sejam atualizados corretamente.
            </p>
          </div>

          <button
            onClick={handleDeepRepair}
            disabled={clearing}
            className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {clearing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Reparando...
              </>
            ) : (
              <>
                <Wrench size={20} />
                Iniciar Reparação
              </>
            )}
          </button>
        </div>

        <div className="mt-8 p-4 bg-zinc-900/30 rounded-2xl border border-white/5">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Dica de Segurança</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Suas fotos estão seguras na nuvem. A reparação apenas limpa a cópia local que pode ter sido corrompida por falhas de conexão ou armazenamento do dispositivo.
          </p>
        </div>
      </div>
    </div>
  );
}
