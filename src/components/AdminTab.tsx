import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  Loader2, 
  LayoutDashboard, 
  UserCheck, 
  FileText, 
  Zap, 
  Settings,
  Dices,
  LucideIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminConfig } from './admin/useAdminConfig';
import AdminHeader from './admin/AdminHeader';
import AdminSecurityAlert from './admin/AdminSecurityAlert';
import AdminUpdateForm from './admin/AdminUpdateForm';
import AdminStatsGrid from './admin/AdminStatsGrid';
import AdminAccessTable from './admin/AdminAccessTable';
import AdminLogsTable from './admin/AdminLogsTable';
import AdminSecurityTable from './admin/AdminSecurityTable';
import { AdminRouletteTab } from './admin/roulette/AdminRouletteTab';
import { 
  UserAccessRecord, 
  AuditEventRecord, 
  SecurityEventRecord,
  subscribeUserAccesses,
  subscribeAuditLogs,
  subscribeSecurityEvents,
  getPeriodStartTimestamp
} from '../services/adminAuditService';

interface AdminTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onBackToGallery?: () => void;
}

type AdminSubTab = 'stats' | 'accesses' | 'logs' | 'security' | 'roulette' | 'config';

export default function AdminTab({ showToast, onBackToGallery }: AdminTabProps) {
  const { user } = useAuth();
  const {
    isAdmin,
    version,
    setVersion,
    buildNumber,
    setBuildNumber,
    required,
    setRequired,
    securityCode,
    setSecurityCode,
    loading: configLoading,
    saving,
    handleSave,
  } = useAdminConfig(showToast, onBackToGallery);

  const [activeTab, setActiveTab] = useState<AdminSubTab>('stats');
  const [accessRecords, setAccessRecords] = useState<UserAccessRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEventRecord[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEventRecord[]>([]);

  // Inscreve-se nos feeds em tempo real do Firestore
  useEffect(() => {
    if (!isAdmin) return;

    const unsubAccesses = subscribeUserAccesses(setAccessRecords);
    const unsubAudit = subscribeAuditLogs(setAuditLogs);
    const unsubSecurity = subscribeSecurityEvents(setSecurityEvents);

    return () => {
      unsubAccesses();
      unsubAudit();
      unsubSecurity();
    };
  }, [isAdmin]);

  // Cálculo das estatísticas em tempo real
  const stats = useMemo(() => {
    const now = Date.now();
    const fifteenMinAgo = now - 15 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const startOfToday = getPeriodStartTimestamp('today');

    const onlineCount = accessRecords.filter(r => (r.lastAccess || 0) >= fifteenMinAgo).length;
    const active24hCount = accessRecords.filter(r => (r.lastAccess || 0) >= twentyFourHoursAgo).length;

    const accessesTodayCount = auditLogs.filter(
      l => l.timestamp >= startOfToday && (l.type === 'system_entry' || l.type === 'login')
    ).length;

    const sharesTodayCount = auditLogs.filter(
      l => l.timestamp >= startOfToday && l.type === 'share_create'
    ).length;

    const uploadsTodayCount = auditLogs.filter(
      l => l.timestamp >= startOfToday && l.type === 'file_upload'
    ).length;

    const deletionsTodayCount = auditLogs.filter(
      l => l.timestamp >= startOfToday && l.type === 'file_delete'
    ).length;

    const attacksTodayCount = securityEvents.filter(
      s => s.timestamp >= startOfToday
    ).length;

    const rateLimitsTodayCount = securityEvents.filter(
      s => s.timestamp >= startOfToday && (s.type === 'rate_limit' || s.type === 'captcha_triggered' || s.type === 'temporary_block')
    ).length;

    return {
      onlineCount,
      active24hCount,
      accessesTodayCount,
      sharesTodayCount,
      uploadsTodayCount,
      deletionsTodayCount,
      attacksTodayCount,
      rateLimitsTodayCount,
    };
  }, [accessRecords, auditLogs, securityEvents]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-[#050505]">
        <ShieldAlert size={48} className="text-red-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-bold text-white mb-2">Acesso Restrito</h3>
        <p className="text-zinc-500 text-sm max-w-md leading-relaxed">
          Esta área é reservada para administradores credenciados. Seu e-mail ({user?.email || 'Nenhum usuário logado'}) não possui acesso.
        </p>
      </div>
    );
  }

  if (configLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#050505]">
        <Loader2 className="w-8 h-8 text-white animate-spin" strokeWidth={1.5} />
        <p className="text-zinc-500 text-sm mt-3 font-medium">Carregando painel administrativo...</p>
      </div>
    );
  }

  interface SubTabItem {
    id: AdminSubTab;
    label: string;
    icon: LucideIcon;
    count?: number;
  }

  const subTabs: SubTabItem[] = [
    { id: 'stats', label: 'Visão Geral & Métricas', icon: LayoutDashboard },
    { id: 'accesses', label: 'Painel de Acessos', icon: UserCheck, count: accessRecords.length },
    { id: 'logs', label: 'Logs do Sistema', icon: FileText, count: auditLogs.length },
    { id: 'security', label: 'Monitor de Ataques', icon: Zap, count: securityEvents.length },
    { id: 'roulette', label: 'Roleta de Prêmios', icon: Dices },
    { id: 'config', label: 'Configurações do App', icon: Settings },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 lg:py-10 text-zinc-100 select-none bg-[#050505] min-h-screen space-y-6">
      <AdminHeader onBackToGallery={onBackToGallery} />

      {/* Navegação por Sub-abas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10 no-scrollbar">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-black font-bold shadow'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-white/5'
              }`}
            >
              <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo das Sub-abas */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <AdminStatsGrid {...stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminAccessTable records={accessRecords.slice(0, 5)} />
            <AdminSecurityTable records={securityEvents.slice(0, 5)} />
          </div>
        </div>
      )}

      {activeTab === 'accesses' && (
        <AdminAccessTable records={accessRecords} />
      )}

      {activeTab === 'logs' && (
        <AdminLogsTable records={auditLogs} />
      )}

      {activeTab === 'security' && (
        <AdminSecurityTable records={securityEvents} />
      )}

      {activeTab === 'roulette' && (
        <AdminRouletteTab />
      )}

      {activeTab === 'config' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <AdminSecurityAlert />
          <AdminUpdateForm
            version={version}
            setVersion={setVersion}
            buildNumber={buildNumber}
            setBuildNumber={setBuildNumber}
            required={required}
            setRequired={setRequired}
            securityCode={securityCode}
            setSecurityCode={setSecurityCode}
            saving={saving}
            onSubmit={(e) => {
              handleSave(e);
            }}
          />
        </div>
      )}
    </div>
  );
}
