import React from 'react';
import { Shield, Image as ImageIcon, Trash2, Settings, Lock, LogOut, Sliders, Dices } from 'lucide-react';

interface GallerySidebarProps {
  onViewGallery: () => void;
  onOpenTrash: () => void;
  onOpenSettings: () => void;
  onOpenRoulette?: () => void;
  onOpenAdmin?: () => void;
  onLockVault: () => void;
  onLogOut: () => void;
  onViewProtected: () => void;
  currentView?: 'gallery' | 'trash' | 'settings' | 'protected' | 'admin' | 'roulette';
  isAdmin?: boolean;
}

export default function GallerySidebar({
  onViewGallery,
  onOpenTrash,
  onOpenSettings,
  onOpenRoulette,
  onOpenAdmin,
  onViewProtected,
  onLockVault,
  onLogOut,
  currentView = 'gallery',
  isAdmin = false
}: GallerySidebarProps) {
  return (
    <aside 
      id="gallery-desktop-sidebar" 
      className="hidden lg:flex w-64 xl:w-72 flex-col sticky top-0 h-screen border-r border-white/[0.06] bg-[#050505] p-5 xl:p-6 shrink-0 z-40 justify-between select-none"
    >
      <div className="flex flex-col flex-1">
        <div className="mb-8 px-3 py-2" id="brand-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-200">
              <Shield size={16} />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-zinc-100 leading-tight">Cofre de Fotos</h1>
              <p className="text-[10px] font-medium text-zinc-500 tracking-wider uppercase">Armazenamento Criptografado</p>
            </div>
          </div>
        </div>

        <nav className="space-y-1" id="main-navigation">
          <button 
            id="nav-btn-gallery"
            type="button"
            onClick={onViewGallery}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
              currentView === 'gallery'
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border border-transparent'
            }`}
          >
            <ImageIcon size={17} className="shrink-0" />
            <span>Sua Galeria</span>
          </button>
          
          <button 
            id="nav-btn-trash"
            type="button"
            onClick={onOpenTrash}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
              currentView === 'trash'
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Trash2 size={17} className="shrink-0" />
            <span>Lixeira</span>
          </button>
          
          <button 
            id="nav-btn-settings"
            type="button"
            onClick={onOpenSettings}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
              currentView === 'settings'
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Settings size={17} className="shrink-0" />
            <span>Configurações</span>
          </button>

          {onOpenRoulette && (
            <button 
              id="nav-btn-roulette"
              type="button"
              onClick={onOpenRoulette}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                currentView === 'roulette'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-amber-300/90 hover:bg-amber-500/10 hover:text-amber-200 border border-transparent hover:border-amber-500/20'
              }`}
            >
              <Dices size={17} className="shrink-0 text-amber-400" />
              <span>Roleta de Prêmios</span>
            </button>
          )}

          {isAdmin && onOpenAdmin && (
            <button 
              id="nav-btn-admin"
              type="button"
              onClick={onOpenAdmin}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Sliders size={17} className="shrink-0" />
              <span>Administração</span>
            </button>
          )}
        </nav>
      </div>

      <div className="mt-auto space-y-3 pt-5 border-t border-white/[0.06]" id="bottom-navigation">
        <div className="space-y-1">
          <button 
            id="nav-btn-lock"
            type="button"
            onClick={onLockVault}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-amber-400/90 hover:bg-amber-500/10 hover:text-amber-300 font-medium transition-all duration-150 cursor-pointer"
          >
            <Lock size={17} className="shrink-0" />
            <span>Bloquear Cofre</span>
          </button>
          <button 
            id="nav-btn-logout"
            type="button"
            onClick={onLogOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-red-400/90 hover:bg-red-500/10 hover:text-red-300 font-medium transition-all duration-150 cursor-pointer"
          >
            <LogOut size={17} className="shrink-0" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
