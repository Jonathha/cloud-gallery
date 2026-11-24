import React from 'react';
import { Info, Share2, Check, Download, Lock, ExternalLink } from 'lucide-react';

interface PublicMediaFooterProps {
  showControls: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  copied: boolean;
  handleShareOrCopy: (e: React.MouseEvent) => void;
  allowDownload: boolean;
  decryptedUrl: string | null;
  isVideo: boolean;
  showToast: (msg: string) => void;
}

export default function PublicMediaFooter({
  showControls,
  setIsDetailsOpen,
  copied,
  handleShareOrCopy,
  allowDownload,
  decryptedUrl,
  isVideo,
  showToast,
}: PublicMediaFooterProps) {
  return (
    <footer
      className={`w-full bg-black/85 border-t border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-around backdrop-blur-md z-40 transition-opacity duration-300 ${
        showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* 1. Detalhes / Informações */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsDetailsOpen(true);
        }}
        className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95 group px-2 py-1"
      >
        <Info size={20} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-medium tracking-tight">Detalhes</span>
      </button>

      {/* 2. Compartilhar / Copiar Link */}
      <button
        type="button"
        onClick={handleShareOrCopy}
        className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95 group px-2 py-1"
      >
        {copied ? (
          <Check size={20} className="text-emerald-400 scale-110 transition-transform" />
        ) : (
          <Share2 size={20} className="group-hover:scale-110 transition-transform" />
        )}
        <span className="text-[10px] font-medium tracking-tight">
          {copied ? 'Copiado!' : 'Compartilhar'}
        </span>
      </button>

      {/* 3. Download (habilitado se permitido) */}
      {allowDownload && decryptedUrl ? (
        <a
          id="btn-permit-download"
          href={decryptedUrl}
          download={isVideo ? `shared-video-${Date.now()}.mp4` : `shared-image-${Date.now()}.png`}
          onClick={(e) => {
            e.stopPropagation();
            showToast('Download iniciado...');
          }}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95 group px-2 py-1"
        >
          <Download size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-medium tracking-tight">Baixar</span>
        </a>
      ) : (
        <div
          className="flex flex-col items-center gap-1 text-zinc-600 opacity-60 px-2 py-1 select-none"
        >
          <Lock size={20} />
          <span className="text-[10px] font-medium tracking-tight">Protegido</span>
        </div>
      )}

      {/* 4. Abrir no App / Galeria */}
      <a
        href="/"
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95 group px-2 py-1"
      >
        <ExternalLink size={20} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-medium tracking-tight">Abrir App</span>
      </a>
    </footer>
  );
}
