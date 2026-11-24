import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Cabeçalho e banner de aviso de recuperação para a configuração inicial do cofre
 */
export const VaultSetupHeader: React.FC = () => {
  return (
    <>
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
          Configuração do Cofre
        </h2>
        <p className="text-zinc-400 text-xs sm:text-sm px-2 leading-relaxed">
          Defina sua credencial mestre e escolha o modo de proteção por criptografia.
        </p>
      </div>

      <div className="p-3.5 bg-zinc-900/60 border border-white/10 rounded-2xl flex items-start gap-3">
        <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
        <p className="text-[11px] text-zinc-300 leading-tight">
          Guarde suas senhas em um local seguro. Se você as esquecer, não será possível recuperar seus arquivos criptografados.
        </p>
      </div>
    </>
  );
};

export const VaultSetupAmbientLight: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-white/[0.02] rounded-full blur-3xl" />
    </div>
  );
};
