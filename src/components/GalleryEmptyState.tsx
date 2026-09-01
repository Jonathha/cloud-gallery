import React from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon, ShieldCheck } from 'lucide-react';

interface GalleryEmptyStateProps {
  setIsUploaderOpen: (val: boolean) => void;
}

export default function GalleryEmptyState({ setIsUploaderOpen }: GalleryEmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="text-center py-16 sm:py-24 text-zinc-500 space-y-5 px-4 flex flex-col items-center justify-center min-h-[45vh]"
    >
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-lg">
          <ImageIcon size={32} className="text-zinc-300" strokeWidth={1.5} />
        </div>
      </div>

      <div className="space-y-1.5 max-w-sm mx-auto">
        <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight">Cofre Vazio</h3>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
          Sua galeria está vazia. Fotos e vídeos adicionados serão armazenados no cofre com criptografia de ponta a ponta.
        </p>
      </div>

      <button 
        onClick={() => setIsUploaderOpen(true)}
        className="mt-1 px-6 py-2.5 bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-medium rounded-xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-2"
      >
        <ImageIcon size={16} />
        <span>Adicionar Primeira Foto</span>
      </button>

      <div className="pt-1 flex items-center gap-1.5 text-xs text-zinc-500 font-normal">
        <ShieldCheck size={13} className="text-emerald-400/90" />
        <span>Criptografia de ponta a ponta ativa</span>
      </div>
    </motion.div>
  );
}

