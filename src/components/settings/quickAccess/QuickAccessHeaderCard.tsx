import React from "react";
import { Zap, Smartphone } from "lucide-react";

interface QuickAccessHeaderCardProps {
  isEnabled: boolean;
}

export function QuickAccessHeaderCard({ isEnabled }: QuickAccessHeaderCardProps) {
  return (
    <section className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative p-2.5 bg-zinc-800/80 rounded-xl border border-white/5 text-zinc-200 shrink-0">
              <Zap size={20} />
              <span
                aria-hidden="true"
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
                  isEnabled ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white truncate">Acesso Rápido</h3>
              <p className="text-xs text-zinc-400 truncate">Entrada direta neste aparelho</p>
            </div>
          </div>

          <span
            role="status"
            className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full border ${
              isEnabled
                ? "bg-zinc-100 text-zinc-900 border-zinc-200"
                : "bg-zinc-800/60 text-zinc-400 border-white/5"
            }`}
          >
            {isEnabled ? "Ativado" : "Desativado"}
          </span>
        </div>

        <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
          Mantém seu cofre autenticado neste navegador/celular para abrir sua galeria instantaneamente sem redigitar a senha a cada visita.
        </p>
      </div>

      <div className="flex items-start gap-3 px-4 sm:px-5 py-3 bg-black/20 border-t border-white/5 text-xs text-zinc-400">
        <Smartphone size={16} className="shrink-0 text-zinc-400 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-medium text-zinc-300">Armazenamento local seguro. </span>
          A chave de entrada fica salva apenas na memória protegida deste dispositivo.
        </p>
      </div>
    </section>
  );
}

export default QuickAccessHeaderCard;
