import React from 'react';
import { 
  Users, 
  Activity, 
  Clock, 
  Share2, 
  Upload, 
  Trash2, 
  ShieldAlert, 
  Zap 
} from 'lucide-react';

interface AdminStatsGridProps {
  onlineCount: number;
  active24hCount: number;
  accessesTodayCount: number;
  sharesTodayCount: number;
  uploadsTodayCount: number;
  deletionsTodayCount: number;
  attacksTodayCount: number;
  rateLimitsTodayCount: number;
}

export default function AdminStatsGrid({
  onlineCount,
  active24hCount,
  accessesTodayCount,
  sharesTodayCount,
  uploadsTodayCount,
  deletionsTodayCount,
  attacksTodayCount,
  rateLimitsTodayCount,
}: AdminStatsGridProps) {
  const stats = [
    {
      label: 'Usuários Online',
      sublabel: 'Ativos nos últimos 15 min',
      value: onlineCount,
      icon: Users,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      label: 'Usuários Ativos (24h)',
      sublabel: 'Logados nas últimas 24 horas',
      value: active24hCount,
      icon: Activity,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
    },
    {
      label: 'Total de Acessos Hoje',
      sublabel: 'Sessões registradas no dia',
      value: accessesTodayCount,
      icon: Clock,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    },
    {
      label: 'Shares Criados Hoje',
      sublabel: 'Links de mídia compartilhados',
      value: sharesTodayCount,
      icon: Share2,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20'
    },
    {
      label: 'Uploads Realizados Hoje',
      sublabel: 'Arquivos enviados hoje',
      value: uploadsTodayCount,
      icon: Upload,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    },
    {
      label: 'Exclusões Hoje',
      sublabel: 'Arquivos removidos no dia',
      value: deletionsTodayCount,
      icon: Trash2,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    {
      label: 'Ataques Detectados Hoje',
      sublabel: 'Probes, 401/403/404 e abusos',
      value: attacksTodayCount,
      icon: ShieldAlert,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    },
    {
      label: 'Rate Limits Acionados Hoje',
      sublabel: 'Bloqueios e desafios 429',
      value: rateLimitsTodayCount,
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
      {stats.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 tracking-wide">
                {item.label}
              </span>
              <div className={`p-2 rounded-xl border ${item.color}`}>
                <Icon size={16} strokeWidth={2} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight font-mono">
                {item.value}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {item.sublabel}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
