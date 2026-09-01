import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Zap, 
  Lock, 
  Key, 
  AlertTriangle, 
  FileWarning, 
  Ban, 
  UserX,
  ServerOff
} from 'lucide-react';
import { SecurityEventRecord, SecurityEventType, getPeriodStartTimestamp } from '../../services/adminAuditService';

interface AdminSecurityTableProps {
  records: SecurityEventRecord[];
}

export default function AdminSecurityTable({ records }: AdminSecurityTableProps) {
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

      // Threat type filter
      if (selectedType !== 'all') {
        if (selectedType === 'http_401' && record.type !== 'http_401' && record.type !== 'unauthorized_access') return false;
        if (selectedType === 'http_403' && record.type !== 'http_403') return false;
        if (selectedType === 'http_404' && record.type !== 'http_404') return false;
        if (selectedType === 'http_410' && record.type !== 'http_410') return false;
        if (selectedType !== 'http_401' && selectedType !== 'http_403' && selectedType !== 'http_404' && selectedType !== 'http_410' && record.type !== selectedType) {
          return false;
        }
      }

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchUser = record.userEmail?.toLowerCase().includes(term) || record.userId?.toLowerCase().includes(term);
        const matchReason = record.reason?.toLowerCase().includes(term);
        const matchModule = record.module?.toLowerCase().includes(term);
        const matchIp = record.ip?.toLowerCase().includes(term);
        const matchPath = record.path?.toLowerCase().includes(term);
        if (!matchUser && !matchReason && !matchModule && !matchIp && !matchPath) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchTerm, selectedType, period, customStart, customEnd]);

  const getThreatBadge = (type: SecurityEventType) => {
    switch (type) {
      case 'brute_force':
        return {
          label: 'Força Bruta',
          icon: Ban,
          className: 'bg-red-500/10 text-red-400 border-red-500/20'
        };
      case 'rate_limit':
        return {
          label: 'Rate Limit (429)',
          icon: Zap,
          className: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
      case 'temporary_block':
        return {
          label: 'Bloqueio Temporário',
          icon: Lock,
          className: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        };
      case 'captcha_triggered':
        return {
          label: 'CAPTCHA Acionado',
          icon: Key,
          className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        };
      case 'share_enumeration':
        return {
          label: 'Enumeração Share',
          icon: AlertTriangle,
          className: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
        };
      case 'unauthorized_access':
      case 'http_401':
        return {
          label: 'Acesso Não Autorizado (401)',
          icon: UserX,
          className: 'bg-red-500/10 text-red-400 border-red-500/20'
        };
      case 'http_403':
        return {
          label: 'Proibido (403)',
          icon: Ban,
          className: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        };
      case 'http_404':
        return {
          label: 'Não Encontrado (404)',
          icon: FileWarning,
          className: 'bg-zinc-800 text-zinc-400 border-zinc-700'
        };
      case 'http_410':
        return {
          label: 'Recurso Expirado (410)',
          icon: ServerOff,
          className: 'bg-zinc-800 text-zinc-400 border-zinc-700'
        };
      default:
        return {
          label: type,
          icon: ShieldAlert,
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
          <ShieldAlert size={20} className="text-rose-400" />
          <div>
            <h3 className="text-base font-bold text-white">Monitor de Ataques e Ameaças</h3>
            <p className="text-xs text-zinc-500">Monitoramento ativo de força bruta, rate limits, captchas e erros de segurança</p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Pesquisa */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Pesquisar por IP, e-mail, motivo ou rota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Tipo de ameaça */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <Filter size={14} className="text-zinc-500 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-white">Todas as Ameaças</option>
              <option value="brute_force" className="bg-zinc-900 text-white">Força Bruta</option>
              <option value="rate_limit" className="bg-zinc-900 text-white">Rate Limits Acionados</option>
              <option value="temporary_block" className="bg-zinc-900 text-white">Bloqueios Temporários</option>
              <option value="captcha_triggered" className="bg-zinc-900 text-white">CAPTCHAs Acionados</option>
              <option value="share_enumeration" className="bg-zinc-900 text-white">Enumeração Share</option>
              <option value="unauthorized_access" className="bg-zinc-900 text-white">Acesso Não Autorizado</option>
              <option value="http_401" className="bg-zinc-900 text-white">Erro HTTP 401</option>
              <option value="http_403" className="bg-zinc-900 text-white">Erro HTTP 403</option>
              <option value="http_404" className="bg-zinc-900 text-white">Erro HTTP 404</option>
              <option value="http_410" className="bg-zinc-900 text-white">Erro HTTP 410</option>
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

      {/* Tabela de ameaças */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-zinc-950/60">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900/80 text-zinc-400 font-semibold border-b border-white/5 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Data e Hora</th>
              <th className="py-3 px-4">Tipo de Ameaça</th>
              <th className="py-3 px-4">Módulo</th>
              <th className="py-3 px-4">IP / Usuário</th>
              <th className="py-3 px-4">Motivo / Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500">
                  Nenhum evento de segurança ou ataque detectado no período.
                </td>
              </tr>
            ) : (
              filteredRecords.map((item, idx) => {
                const badge = getThreatBadge(item.type);
                const BadgeIcon = badge.icon;
                return (
                  <tr key={item.id || idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-zinc-500" />
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${badge.className}`}>
                        <BadgeIcon size={13} />
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-zinc-300">
                      <span className="px-2 py-0.5 bg-zinc-900 border border-white/10 rounded-md">
                        {item.module || 'general'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-white font-semibold">{item.ip || 'IP N/A'}</div>
                      <div className="text-[10px] text-zinc-500">{item.userEmail || item.userId || 'Anônimo'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 max-w-xs md:max-w-md truncate" title={item.reason + (item.path ? ` (${item.path})` : '')}>
                      <span className="font-medium text-white">{item.reason}</span>
                      {item.path && <div className="text-[10px] text-zinc-500 font-mono truncate">{item.path}</div>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
        <span>Total de ameaças registradas: {records.length}</span>
        <span>Exibindo: {filteredRecords.length}</span>
      </div>
    </div>
  );
}
