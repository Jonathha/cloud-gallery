import React from 'react';
import { Play, Sparkles, Clock, Globe } from 'lucide-react';
import { RouletteSpinRecord } from '../../../services/rouletteService';

interface AdminRouletteSpinsTableProps {
  spins: RouletteSpinRecord[];
  loading: boolean;
  onSelectReplay: (spin: RouletteSpinRecord) => void;
}

export function AdminRouletteSpinsTable({ spins, loading, onSelectReplay }: AdminRouletteSpinsTableProps) {
  if (loading) {
    return <div className="p-8 text-center text-zinc-500 text-xs">Carregando histórico de partidas...</div>;
  }

  if (spins.length === 0) {
    return <div className="p-8 text-center text-zinc-500 text-xs">Nenhuma partida registrada no D1.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/40">
      <table className="w-full text-left text-xs text-zinc-300">
        <thead className="bg-white/5 uppercase text-[10px] text-zinc-400 font-semibold border-b border-white/10">
          <tr>
            <th className="px-4 py-3">Partida ID</th>
            <th className="px-4 py-3">Usuário</th>
            <th className="px-4 py-3">Prêmio Obtido</th>
            <th className="px-4 py-3 text-center">Saldo Restante</th>
            <th className="px-4 py-3">Data / Hora</th>
            <th className="px-4 py-3 text-right">Demonstração</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {spins.map((s) => (
            <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">
                {s.id.substring(0, 16)}...
              </td>
              <td className="px-4 py-3">
                <div className="font-semibold text-white truncate max-w-[160px]">
                  {s.user_email || 'Anônimo'}
                </div>
                {s.ip && (
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Globe size={10} />
                    <span>{s.ip}</span>
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
                  <Sparkles size={11} />
                  <span>{s.reward_label}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center font-mono text-zinc-400">
                {s.spins_remaining} / 3
              </td>
              <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">
                <div className="flex items-center gap-1">
                  <Clock size={11} />
                  <span>{new Date(s.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onSelectReplay(s)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all cursor-pointer shadow hover:scale-105 active:scale-95"
                >
                  <Play size={12} className="fill-white" />
                  <span>Ver Demonstração</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
