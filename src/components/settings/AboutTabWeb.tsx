import React from 'react';
import { Download } from 'lucide-react';

interface AboutTabWebProps {
  handleInstallApp: () => void;
}

export default function AboutTabWeb({ handleInstallApp }: AboutTabWebProps) {
  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl text-white">
          <Download size={20} />
        </div>
        <h3 className="text-lg font-semibold text-white">Instalar Aplicativo</h3>
      </div>

      <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-3xl space-y-4">
        <div>
          <p className="text-sm font-semibold text-white">Versão Móvel Oficial</p>
          <p className="text-xs text-zinc-400 mt-1">
            Instale o aplicativo oficial para obter melhor desempenho, segurança aprimorada e carregamento instantâneo.
          </p>
        </div>

        <button
          onClick={handleInstallApp}
          className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download size={20} />
          Instalar Aplicativo
        </button>
      </div>
    </div>
  );
}
