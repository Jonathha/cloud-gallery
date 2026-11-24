import React from 'react';
import { Shield, Image as ImageIcon, Settings, Lock, LogOut, Sliders, MessageSquare } from 'lucide-react';
import TrashIcon from './icons/TrashIcon';

interface GallerySidebarProps {
  onViewGallery: () => void;
  onOpenTrash: () => void;
  onOpenSettings: () => void;
  onOpenAdmin?: () => void;
  onOpenChat?: () => void;
  onLockVault: () => void;
  onLogOut: () => void;
  onViewProtected: () => void;
  currentView?: 'gallery' | 'trash' | 'settings' | 'protected' | 'admin' | 'chat';
  isAdmin?: boolean;
}

export default function GallerySidebar({
  onViewGallery,
  onOpenTrash,
  onOpenSettings,
  onOpenAdmin,
  onOpenChat,
  onViewProtected,
  onLockVault,
  onLogOut,
  currentView = 'gallery',
  isAdmin = false
}: GallerySidebarProps) {
  const getNavButtonClass = (viewName: string) => {
    const isActive = currentView === viewName;
    return `w-full flex items-center gap-4 px-4 py-3 rounded-full text-sm font-medium transition-[background-color,color,transform] duration-200 ease-out cursor-pointer select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
      isActive
        ? 'bg-white/15 text-white font-semibold'
        : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
    }`;
  };

  return (
    <aside 
      id="gallery-desktop-sidebar" 
      className="hidden lg:flex w-64 xl:w-72 flex-col sticky top-0 h-screen bg-[#050505] p-4 xl:p-5 shrink-0 z-40 justify-between select-none"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="mb-6 px-3 py-1.5" id="brand-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.08] flex items-center justify-center text-zinc-200 shrink-0">
              <Shield size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100 leading-tight truncate">Cofre de Fotos</h1>
              <p className="text-[10px] font-medium text-zinc-400 tracking-wide uppercase truncate">Dados Criptografados</p>
            </div>
          </div>
        </div>

        <nav className="space-y-1.5 overflow-y-auto pr-1" id="main-navigation">
          <button 
            id="nav-btn-gallery"
            type="button"
            onClick={onViewGallery}
            className={getNavButtonClass('gallery')}
          >
            <ImageIcon size={18} className="shrink-0" />
            <span>Sua Galeria</span>
          </button>
          
          <button 
            id="nav-btn-trash"
            type="button"
            onClick={onOpenTrash}
            className={getNavButtonClass('trash')}
          >
            <TrashIcon size={18} className="shrink-0" />
            <span>Lixeira</span>
          </button>
          
          <button 
            id="nav-btn-settings"
            type="button"
            onClick={onOpenSettings}
            className={getNavButtonClass('settings')}
          >
            <Settings size={18} className="shrink-0" />
            <span>Configurações</span>
          </button>

          {onOpenChat && (
            <button 
              id="nav-btn-chat"
              type="button"
              onClick={onOpenChat}
              className={getNavButtonClass('chat')}
            >
              <MessageSquare size={18} className="shrink-0" />
              <span>Chat Global</span>
            </button>
          )}

          {isAdmin && onOpenAdmin && (
            <button 
              id="nav-btn-admin"
              type="button"
              onClick={onOpenAdmin}
              className={getNavButtonClass('admin')}
            >
              <Sliders size={18} className="shrink-0" />
              <span>Administração</span>
            </button>
          )}
        </nav>
      </div>

      <div className="mt-auto space-y-1.5 pt-4 border-t border-white/[0.04]" id="bottom-navigation">
        <button 
          id="nav-btn-lock"
          type="button"
          onClick={onLockVault}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-full text-sm text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 font-medium transition-[background-color,color,transform] duration-200 ease-out cursor-pointer select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
        >
          <Lock size={18} className="shrink-0" />
          <span>Bloquear Cofre</span>
        </button>
        <button 
          id="nav-btn-logout"
          type="button"
          onClick={onLogOut}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-full text-sm text-zinc-400 hover:bg-red-500/10 hover:text-red-400 font-medium transition-[background-color,color,transform] duration-200 ease-out cursor-pointer select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
        >
          <LogOut size={18} className="shrink-0" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
}
