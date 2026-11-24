import React from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminConfig } from './admin/useAdminConfig';
import AdminHeader from './admin/AdminHeader';
import AdminSecurityAlert from './admin/AdminSecurityAlert';
import AdminUpdateForm from './admin/AdminUpdateForm';

interface AdminTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onBackToGallery?: () => void;
}

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
    apkUrl,
    setApkUrl,
    loading: configLoading,
    saving,
    handleSave,
  } = useAdminConfig(showToast, onBackToGallery);

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
        <p className="text-zinc-500 text-sm mt-3 font-medium">Carregando configurações de atualização...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 lg:py-10 text-zinc-100 select-none bg-[#050505] min-h-screen space-y-6">
      <AdminHeader onBackToGallery={onBackToGallery} />

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
          apkUrl={apkUrl}
          setApkUrl={setApkUrl}
          saving={saving}
          onSubmit={(e) => {
            handleSave(e);
          }}
        />
      </div>
    </div>
  );
}
