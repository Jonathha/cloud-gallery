import React from "react";
import { ShieldCheck, Loader2 } from "lucide-react";

interface QuickAccessActiveViewProps {
  loading: boolean;
  handleDisable: () => void;
}

export function QuickAccessActiveView({ loading, handleDisable }: QuickAccessActiveViewProps) {
  return (
    <section className="p-4 sm:p-5 bg-zinc-900/40 border border-white/10 rounded-2xl space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck size={20} className="shrink-0 text-zinc-300 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white">Dispositivo autenticado</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ao abrir o aplicativo neste aparelho, seu cofre será aberto de forma direta e automática.
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-white/5 flex sm:justify-end">
        <button
          type="button"
          onClick={handleDisable}
          disabled={loading}
          className="w-full sm:w-auto h-11 px-4 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-sm sm:text-xs rounded-xl transition-colors border border-white/10 cursor-pointer touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          <span>Desativar Acesso Rápido</span>
        </button>
      </div>
    </section>
  );
}

export default QuickAccessActiveView;
