import React from 'react';

interface UpdateProgressViewProps {
  progress: number;
}

export function UpdateProgressView({ progress }: UpdateProgressViewProps) {
  return (
    <div className="w-full space-y-4 text-center">
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Baixando Atualização
        </h2>
        <p className="text-zinc-400 text-xs px-1 leading-relaxed">
          Aguarde enquanto preparamos os arquivos de instalação do sistema.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full space-y-2 pt-1">
        <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-white h-full transition-all duration-150 rounded-full" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono px-0.5">
          <span>Progresso do download</span>
          <span className="font-bold text-white">{progress}%</span>
        </div>
      </div>
    </div>
  );
}

