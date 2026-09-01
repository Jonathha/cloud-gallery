import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, UserCheck, Calendar, Clock, RefreshCw } from 'lucide-react';
import { UserAccessRecord } from '../../services/adminAuditService';

interface AdminAccessTableProps {
  records: UserAccessRecord[];
}

export default function AdminAccessTable({ records }: AdminAccessTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'lastAccess' | 'firstAccess' | 'name' | 'accessCount'>('lastAccess');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedRecords = useMemo(() => {
    let list = records.filter(record => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        (record.email && record.email.toLowerCase().includes(term)) ||
        (record.displayName && record.displayName.toLowerCase().includes(term)) ||
        (record.uid && record.uid.toLowerCase().includes(term))
      );
    });

    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'lastAccess') {
        comparison = (a.lastAccess || 0) - (b.lastAccess || 0);
      } else if (sortBy === 'firstAccess') {
        comparison = (a.firstAccess || 0) - (b.firstAccess || 0);
      } else if (sortBy === 'name') {
        const nameA = a.displayName || a.email || '';
        const nameB = b.displayName || b.email || '';
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === 'accessCount') {
        comparison = (a.accessCount || 0) - (b.accessCount || 0);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return list;
  }, [records, searchTerm, sortBy, sortOrder]);

  const toggleSort = (field: 'lastAccess' | 'firstAccess' | 'name' | 'accessCount') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (timestamp: number, timeZone?: string) => {
    if (!timestamp) return 'N/A';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      }).format(new Date(timestamp));
    } catch (e) {
      return new Date(timestamp).toLocaleString('pt-BR');
    }
  };

  return (
    <div className="bg-zinc-900/30 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <UserCheck size={20} className="text-zinc-300" />
          <div>
            <h3 className="text-base font-bold text-white">Painel de Acessos</h3>
            <p className="text-xs text-zinc-500">Histórico detalhado de entrada e atividade dos usuários</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Pesquisa */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Pesquisar por nome, e-mail ou UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <ArrowUpDown size={14} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-500 hidden sm:inline">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="lastAccess" className="bg-zinc-900 text-white">Último Acesso</option>
              <option value="firstAccess" className="bg-zinc-900 text-white">Primeiro Acesso</option>
              <option value="name" className="bg-zinc-900 text-white">Nome / E-mail</option>
              <option value="accessCount" className="bg-zinc-900 text-white">Quantidade de Acessos</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="ml-1 text-zinc-400 hover:text-white text-[11px] font-mono uppercase"
              title="Alternar ordem de classificação"
            >
              [{sortOrder.toUpperCase()}]
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de acessos */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-zinc-950/60">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-white/5 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                Usuário / E-mail
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('firstAccess')}>
                Primeiro Acesso
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort('lastAccess')}>
                Último Acesso
              </th>
              <th className="py-3 px-4 text-center cursor-pointer hover:text-white" onClick={() => toggleSort('accessCount')}>
                Qtd. Acessos
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAndSortedRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-zinc-500">
                  Nenhum registro de acesso encontrado.
                </td>
              </tr>
            ) : (
              filteredAndSortedRecords.map((item) => (
                <tr key={item.uid} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{item.displayName || item.email}</span>
                      {item.anonymous && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Anônimo
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">{item.email}</div>
                    <div className="text-[10px] text-zinc-600 font-mono">UID: {item.uid}</div>
                    {(item.browser || item.operatingSystem || item.ip || item.country) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-zinc-400">
                        {item.ip && <span className="bg-zinc-900 px-1.5 py-0.5 rounded font-mono border border-white/5">{item.ip}</span>}
                        {(item.city || item.country) && (
                          <span className="text-zinc-500">
                            {[item.city, item.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {(item.browser || item.operatingSystem) && (
                          <span className="text-zinc-500">
                            {[item.browser, item.operatingSystem].filter(Boolean).join(' / ')}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Calendar size={13} className="text-zinc-500" />
                      <span>{formatDate(item.firstAccess, item.timeZone)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                      <Clock size={13} className="text-emerald-400" />
                      <span>{formatDate(item.lastAccess, item.timeZone)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">Fuso: {item.timeZone || 'UTC'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                    <span className="px-2.5 py-1 bg-zinc-900 border border-white/10 rounded-lg">
                      {item.accessCount || 1}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
        <span>Total de usuários registrados: {records.length}</span>
        <span>Exibindo: {filteredAndSortedRecords.length}</span>
      </div>
    </div>
  );
}
