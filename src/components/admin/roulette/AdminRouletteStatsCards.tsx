import React from 'react';
import { Dices, Users, Sparkles } from 'lucide-react';

interface AdminRouletteStatsCardsProps {
  totalSpins: number;
  totalUsers: number;
  totalRemainingSpins: number;
}

export function AdminRouletteStatsCards({
  totalSpins,
  totalUsers,
  totalRemainingSpins,
}: AdminRouletteStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-zinc-900/60 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Total de Partidas</div>
          <div className="text-2xl font-bold text-white mt-1">{totalSpins}</div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Dices size={20} />
        </div>
      </div>

      <div className="bg-zinc-900/60 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Jogadores Cadastrados</div>
          <div className="text-2xl font-bold text-white mt-1">{totalUsers}</div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Users size={20} />
        </div>
      </div>

      <div className="bg-zinc-900/60 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Giros Restantes Ativos</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{totalRemainingSpins}</div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Sparkles size={20} />
        </div>
      </div>
    </div>
  );
}
