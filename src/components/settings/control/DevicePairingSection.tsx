import React from 'react';
import { Key, Smartphone } from 'lucide-react';

interface DevicePairingSectionProps {
  deviceId: string;
  inputCode: string;
  setInputCode: (code: string) => void;
  onGenerateCode: () => void;
  onConnect: () => void;
}

export function DevicePairingSection({
  deviceId,
  inputCode,
  setInputCode,
  onGenerateCode,
  onConnect,
}: DevicePairingSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/50 rounded-2xl border border-white/5 space-y-2 text-center">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Meu ID</span>
        <p className="text-sm text-zinc-300 font-mono tracking-wider font-bold">{deviceId}</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={onGenerateCode}
          className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl border border-white/5 transition-all flex flex-col items-center justify-center text-center gap-3"
        >
          <div className="p-3 bg-zinc-900 rounded-full text-zinc-300">
            <Key size={20} />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Gerar Código</h4>
            <p className="text-[10px] text-zinc-400 mt-1">Permitir acesso a este aparelho</p>
          </div>
        </button>

        <div className="w-full p-4 bg-zinc-950 rounded-2xl border border-white/5 space-y-4 flex flex-col items-center text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-zinc-900 rounded-full text-zinc-300">
              <Smartphone size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Conectar a Aparelho</h4>
              <p className="text-[10px] text-zinc-400 mt-1">Use um código para acessar</p>
            </div>
          </div>

          <div className="flex flex-col w-full gap-3">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Código (Ex: ABCD12)"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-center text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:border-white/30"
            />
            <button
              onClick={onConnect}
              disabled={!inputCode.trim()}
              className="w-full py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              Conectar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
