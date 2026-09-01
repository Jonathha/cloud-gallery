import React, { useState } from 'react';
import { User, Dices, Clock, Plus, Minus, Loader2 } from 'lucide-react';
import { RouletteUserRecord } from '../../../services/rouletteService';

interface AdminRouletteUsersTableProps {
  users: RouletteUserRecord[];
  loading: boolean;
  onUpdateSpins?: (userId: string, delta: number) => Promise<void>;
}

export function AdminRouletteUsersTable({ users, loading, onUpdateSpins }: AdminRouletteUsersTableProps) {
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const handleDelta = async (userId: string, delta: number) => {
    if (!onUpdateSpins) return;
    setUpdatingUserId(userId);
    try {
      await onUpdateSpins(userId, delta);
    } catch (err) {
      console.error('Erro ao atualizar giros:', err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500 text-xs">Carregando usuários da roleta...</div>;
  }

  if (users.length === 0) {
    return <div className="p-8 text-center text-zinc-500 text-xs">Nenhum registro de usuário encontrado no D1.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/40">
      <table className="w-full text-left text-xs text-zinc-300">
        <thead className="bg-white/5 uppercase text-[10px] text-zinc-400 font-semibold border-b border-white/10">
          <tr>
            <th className="px-4 py-3">Usuário / Email</th>
            <th className="px-4 py-3 text-center">Giros Restantes</th>
            <th className="px-4 py-3 text-center">Total Realizados</th>
            <th className="px-4 py-3 text-right">Última Atividade</th>
            <th className="px-4 py-3 text-center">Gerenciar Giros</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {users.map((u) => {
            const isUpdating = updatingUserId === u.user_id;

            return (
              <tr key={u.user_id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <User size={12} />
                    </div>
                    <div>
                      <div className="font-semibold text-white truncate max-w-[200px]">
                        {u.email || 'Anônimo'}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">
                        UID: {u.user_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    u.spins_remaining > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {u.spins_remaining} / 3
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-1 text-zinc-400 font-mono">
                    <Dices size={12} />
                    <span>{u.total_spins}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-zinc-500 font-mono text-[11px]">
                  <div className="flex items-center justify-end gap-1">
                    <Clock size={11} />
                    <span>{new Date(u.last_activity).toLocaleString('pt-BR')}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {isUpdating ? (
                      <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                        <Loader2 size={13} className="animate-spin" />
                        <span>Atualizando...</span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleDelta(u.user_id, -1)}
                          disabled={u.spins_remaining <= 0}
                          title="Remover 1 giro do usuário"
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 text-[11px] font-medium border border-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Minus size={12} />
                          <span>-1 Giro</span>
                        </button>
                        <button
                          onClick={() => handleDelta(u.user_id, 1)}
                          title="Adicionar 1 giro ao usuário"
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 text-[11px] font-medium border border-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus size={12} />
                          <span>+1 Giro</span>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

