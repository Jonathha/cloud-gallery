import React from 'react';
import { Sliders, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminHeaderProps {
  onBackToGallery?: () => void;
}

export default function AdminHeader({ onBackToGallery }: AdminHeaderProps) {
  const { user } = useAuth();
  const adminEmail = user?.email || 'Admin Logado';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white shadow-inner">
          <Sliders size={22} className="stroke-[1.5]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Gerenciador de Atualizações</h1>
          <p className="text-xs text-zinc-500 tracking-wide mt-0.5">ADMINISTRAÇÃO DO SISTEMA CLOUD GALLERY</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-medium text-emerald-400">
          <ShieldCheck size={14} className="text-emerald-400" />
          <User size={13} className="text-zinc-400 ml-0.5" />
          <span className="font-mono text-[11px] text-zinc-200">{adminEmail}</span>
        </div>

        {onBackToGallery && (
          <button
            onClick={onBackToGallery}
            className="px-4 py-2 bg-zinc-900 border border-white/10 hover:bg-zinc-800 hover:text-white transition-all rounded-xl text-xs font-semibold text-zinc-300 cursor-pointer"
          >
            Voltar para Galeria
          </button>
        )}
      </div>
    </div>
  );
}

