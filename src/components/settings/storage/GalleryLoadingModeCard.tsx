import React, { useState, useEffect } from 'react';
import { CloudDownload, Sparkles, Zap } from 'lucide-react';

export default function GalleryLoadingModeCard() {
  const [pref, setPref] = useState<'thumbnails_only' | 'full'>('thumbnails_only');

  useEffect(() => {
    const saved = (localStorage.getItem('gallery_download_pref') as 'thumbnails_only' | 'full') || 'thumbnails_only';
    setPref(saved);
  }, []);

  const handleChange = (mode: 'thumbnails_only' | 'full') => {
    setPref(mode);
    localStorage.setItem('gallery_download_pref', mode);
    sessionStorage.setItem('gallery_download_pref', mode);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="p-4 sm:p-5 bg-zinc-900/60 border border-white/[0.08] rounded-2xl space-y-4">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shrink-0">
          <CloudDownload size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold text-sm sm:text-base">
            Modo de Carregamento da Galeria
          </h4>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Escolha como a galeria transmite e pré-carrega as mídias da nuvem no seu dispositivo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-1 rounded-xl border border-white/5">
        <button
          type="button"
          onClick={() => handleChange('thumbnails_only')}
          className={`py-2.5 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            pref === 'thumbnails_only'
              ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Zap size={13} className={pref === 'thumbnails_only' ? 'text-amber-400' : 'text-zinc-500'} />
          Apenas Miniaturas
        </button>

        <button
          type="button"
          onClick={() => handleChange('full')}
          className={`py-2.5 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            pref === 'full'
              ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Sparkles size={13} className={pref === 'full' ? 'text-blue-400' : 'text-zinc-500'} />
          Baixar Tudo na Memória
        </button>
      </div>
    </div>
  );
}
