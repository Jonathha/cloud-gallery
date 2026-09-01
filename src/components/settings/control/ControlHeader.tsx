import React from 'react';
import { Radio } from 'lucide-react';

export function ControlHeader() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-2 mb-6">
      <div className="p-3 bg-zinc-900 border border-white/10 rounded-full text-zinc-300">
        <Radio className="animate-pulse text-zinc-400" size={24} />
      </div>
      <div>
        <h3 className="text-xl font-bold tracking-tight">Acesso Remoto</h3>
        <p className="text-xs text-zinc-400 mt-1">Gerencie seus dispositivos com segurança</p>
      </div>
    </div>
  );
}
