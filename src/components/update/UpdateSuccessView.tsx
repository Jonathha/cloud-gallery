import React from 'react';

export function UpdateSuccessView() {
  return (
    <div className="w-full space-y-3 text-center">
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Instalação Iniciada!
        </h2>
        <p className="text-zinc-400 text-xs px-1 leading-relaxed">
          O arquivo de atualização foi baixado com sucesso. O seu dispositivo deve exibir a janela de instalação automaticamente.
        </p>
      </div>

      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 text-left">
        <p className="text-zinc-400 text-[10px] leading-relaxed">
          Se a janela não aparecer, verifique as notificações do celular ou a pasta de downloads para abrir o arquivo manualmente.
        </p>
      </div>
    </div>
  );
}

