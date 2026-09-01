import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  RouletteUserRecord,
  RouletteSpinRecord,
  fetchAdminRouletteUsers,
  fetchAdminRouletteSpins,
  adminUpdateUserSpins,
} from '../../../services/rouletteService';
import { AdminRouletteUsersTable } from './AdminRouletteUsersTable';
import { AdminRouletteSpinsTable } from './AdminRouletteSpinsTable';
import { AdminRouletteReplayModal } from './AdminRouletteReplayModal';
import { AdminRouletteStatsCards } from './AdminRouletteStatsCards';

export function AdminRouletteTab() {
  const [users, setUsers] = useState<RouletteUserRecord[]>([]);
  const [spins, setSpins] = useState<RouletteSpinRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'spins' | 'users'>('spins');
  const [selectedReplaySpin, setSelectedReplaySpin] = useState<RouletteSpinRecord | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([fetchAdminRouletteUsers(), fetchAdminRouletteSpins()]);
      setUsers(u);
      setSpins(s);
    } catch (err) {
      console.error('[AdminRouletteTab] Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRemainingSpins = users.reduce((acc, u) => acc + (u.spins_remaining || 0), 0);

  const handleUpdateSpins = async (userId: string, delta: number) => {
    const res = await adminUpdateUserSpins(userId, delta);
    if (res.success && res.user) {
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? { ...u, spins_remaining: res.user!.spins_remaining, last_activity: res.user!.last_activity }
            : u
        )
      );
    } else if (!res.success && res.error) {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-6">
      <AdminRouletteStatsCards
        totalSpins={spins.length}
        totalUsers={users.length}
        totalRemainingSpins={totalRemainingSpins}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('spins')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeSubTab === 'spins' ? 'bg-white text-black font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Histórico de Partidas ({spins.length})
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeSubTab === 'users' ? 'bg-white text-black font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Usuários / Saldos ({users.length})
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/5 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
        >
          <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {activeSubTab === 'spins' ? (
        <AdminRouletteSpinsTable
          spins={spins}
          loading={loading}
          onSelectReplay={(spin) => setSelectedReplaySpin(spin)}
        />
      ) : (
        <AdminRouletteUsersTable users={users} loading={loading} onUpdateSpins={handleUpdateSpins} />
      )}

      {selectedReplaySpin && (
        <AdminRouletteReplayModal
          spin={selectedReplaySpin}
          onClose={() => setSelectedReplaySpin(null)}
        />
      )}
    </div>
  );
}
