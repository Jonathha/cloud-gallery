import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function AdminSecurityAlert() {
  return (
    <div className="mb-8 p-4 bg-zinc-950/60 border border-white/5 rounded-2xl flex gap-3.5 items-start">
      <AlertCircle size={18} className="text-zinc-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Como funciona este painel?</h4>
        <p className="text-xs text-zinc-500 leading-relaxed">
          As alterações salvas aqui afetarão instantaneamente todos os usuários que utilizam o aplicativo móvel nativo (WebView). Ao configurar uma versão maior que a instalada no dispositivo do usuário, o aplicativo exibirá a tela de atualização na próxima inicialização.
        </p>
      </div>
    </div>
  );
}
