import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  LogIn, 
  LogOut, 
  Share2, 
  Upload, 
  Trash2, 
  ShieldCheck, 
  Globe 
} from 'lucide-react';
import { AuditEventRecord, AuditEventType, getPeriodStartTimestamp } from '../../services/adminAuditService';

interface AdminLogsTableProps {
  records: AuditEventRecord[];
}

export default function AdminLogsTable({ records }: AdminLogsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [period, setPeriod] = useState<string>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const filteredRecords = useMemo(() => {
    const periodStart = getPeriodStartTimestamp(period, customStart);
    const periodEnd = period === 'custom' && customEnd ? new Date(customEnd).getTime() + 86400000 : Infinity;

    return records.filter(record => {
      // Period filter
      if (record.timestamp < periodStart || record.timestamp > periodEnd) {
        return false;
      }

      // Event type filter
      if (selectedType !== 'all' && record.type !== selectedType) {
        return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchUser = record.userEmail?.toLowerCase().includes(term) || record.userId?.toLowerCase().includes(term);
        const matchDetails = record.details?.toLowerCase().includes(term);
        const matchType = record.type?.toLowerCase().includes(term);
        if (!matchUser && !matchDetails && !matchType) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchTerm, selectedType, period, customStart, customEnd]);

  const getEventBadge = (type: AuditEventType) => {
    switch (type) {
      case 'login':
        return {
          label: 'Login',
          icon: LogIn,
          className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      case 'logout':
        return {
          label: 'Logout',
          icon: LogOut,
          className: 'bg-zinc-800 text-zinc-400 border-zinc-700'
        };
      case 'system_entry':
        return {
          label: 'Entrada no Sistema',
          icon: Globe,
          className: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
        };
      case 'share_create':
        return {
          label: 'Novo Compartilhamento',
          icon: Share2,
          className: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
        };
      case 'file_upload':
        return {
          label: 'Upload de Arquivo',
          icon: Upload,
          className: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        };
      case 'file_delete':
        return {
          label: 'Exclusão de Arquivo',
          icon: Trash2,
          className: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
      case 'admin_action':
        return {
          label: 'Ação Admin',
          icon: ShieldCheck,
          className: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        };
      default:
        return {
          label: type,
          icon: FileText,
          className: 'bg-zinc-800 text-zinc-300 border-zinc-700'
        };
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className="bg-zinc-900/30 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5">
      {/* Header controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <FileText size={20} className="text-zinc-300" />
          <div>
            <h3 className="text-base font-bold text-white">Logs do Sistema</h3>
            <p className="text-xs text-zinc-500">Registro completo e auditável de eventos operacionais</p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Pesquisa */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Pesquisar por usuário, evento ou detalhes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Tipo de evento */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <Filter size={14} className="text-zinc-500 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-white">Todos os Eventos</option>
              <option value="login" className="bg-zinc-900 text-white">Login</option>
              <option value="logout" className="bg-zinc-900 text-white">Logout</option>
              <option value="system_entry" className="bg-zinc-900 text-white">Entrada no Sistema</option>
              <option value="share_create" className="bg-zinc-900 text-white">Criação de Share</option>
              <option value="file_upload" className="bg-zinc-900 text-white">Upload de Arquivo</option>
              <option value="file_delete" className="bg-zinc-900 text-white">Exclusão de Arquivo</option>
              <option value="admin_action" className="bg-zinc-900 text-white">Ação Administrativa</option>
            </select>
          </div>

          {/* Período */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <Calendar size={14} className="text-zinc-500 shrink-0" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="today" className="bg-zinc-900 text-white">Hoje</option>
              <option value="last24h" className="bg-zinc-900 text-white">Últimas 24 Horas</option>
              <option value="last7d" className="bg-zinc-900 text-white">Últimos 7 Dias</option>
              <option value="last30d" className="bg-zinc-900 text-white">Últimos 30 Dias</option>
              <option value="custom" className="bg-zinc-900 text-white">Personalizado</option>
              <option value="all" className="bg-zinc-900 text-white">Todo o Histórico</option>
            </select>
          </div>
        </div>
      </div>

      {/* Datas personalizadas se selecionado */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-950/60 border border-white/5 rounded-2xl text-xs">
          <span className="text-zinc-400 font-semibold">Período Personalizado:</span>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">De:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Até:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tabela de logs */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-zinc-950/60">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-white/5 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Data e Hora</th>
              <th className="py-3 px-4">Evento</th>
              <th className="py-3 px-4">Usuário</th>
              <th className="py-3 px-4">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-zinc-500">
                  Nenhum evento registrado no período selecionado.
                </td>
              </tr>
            ) : (
              filteredRecords.map((log, idx) => {
                const badge = getEventBadge(log.type);
                const BadgeIcon = badge.icon;
                return (
                  <tr key={log.id || idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-zinc-500" />
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${badge.className}`}>
                        <BadgeIcon size={13} />
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{log.userEmail || 'Anônimo'}</div>
                      <div className="text-[10px] text-zinc-600 font-mono">{log.userId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 max-w-xs md:max-w-md">
                      <div className="truncate" title={log.details}>{log.details || '-'}</div>
                      {(log.ip || log.browser || log.operatingSystem) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500 font-mono">
                          {log.ip && <span className="bg-zinc-900 px-1.5 py-0.2 rounded border border-white/5">{log.ip}</span>}
                          {(log.browser || log.operatingSystem) && (
                            <span>{[log.browser, log.operatingSystem].filter(Boolean).join(' / ')}</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
        <span>Total de registros: {records.length}</span>
        <span>Exibindo: {filteredRecords.length}</span>
      </div>
    </div>
  );
}
