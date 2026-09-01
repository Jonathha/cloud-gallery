import React from 'react';
import { motion } from 'motion/react';
import { CheckSquare, CopyCheck, Trash2, X } from 'lucide-react';
import { DecryptedImage } from '../types';
import { isNativeApp, isMobileDevice } from '../utils/isNativeApp';

interface SelectionBottomBarProps {
  selectedForDeletion: string[];
  setSelectedForDeletion: (val: string[]) => void;
  setIsSelectionMode?: (val: boolean) => void;
  images: DecryptedImage[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setDuplicatesToDelete: (val: string[]) => void;
  setIsCleaningDuplicates: (val: boolean) => void;
  setIsDeletingMultiple: (val: boolean) => void;
}

export default function SelectionBottomBar({
  selectedForDeletion,
  setSelectedForDeletion,
  setIsSelectionMode,
  images,
  showToast,
  setDuplicatesToDelete,
  setIsCleaningDuplicates,
  setIsDeletingMultiple
}: SelectionBottomBarProps) {
  const isApp = isNativeApp();
  const isMobile = isMobileDevice();
  const isAllSelected = images.length > 0 && selectedForDeletion.length === images.length;

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedForDeletion([]);
    } else {
      setSelectedForDeletion(images.map(img => img.id));
    }
  };

  const handleCleanDuplicatesTrigger = () => {
    const urlMap = new Map<string, string[]>();
    images.forEach(img => {
      if (!img.failed && img.url) {
        const existing = urlMap.get(img.url) || [];
        urlMap.set(img.url, [...existing, img.id]);
      }
    });
    
    const idsToDelete: string[] = [];
    urlMap.forEach(ids => {
      if (ids.length > 1) {
        idsToDelete.push(...ids.slice(1));
      }
    });
    
    if (idsToDelete.length === 0) {
      showToast('Nenhuma imagem duplicada encontrada.', 'info');
    } else {
      setDuplicatesToDelete(idsToDelete);
      setIsCleaningDuplicates(true);
    }
  };

  const handleDone = () => {
    if (setIsSelectionMode) {
      setIsSelectionMode(false);
    }
    setSelectedForDeletion([]);
  };

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 260 }}
      className="fixed bottom-0 left-0 right-0 bg-[#0a0a0d]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-2xl px-4 py-3 sm:px-6 sm:py-3.5 z-40 shadow-2xl"
      style={{ 
        paddingBottom: isApp 
          ? "1.6rem" 
          : isMobile 
            ? "calc(1.8rem + env(safe-area-inset-bottom, 0px))" 
            : "calc(1rem + env(safe-area-inset-bottom, 0px))" 
      }}
    >
      <div className="max-w-md mx-auto flex flex-col gap-2.5">
        {/* Info header row */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-zinc-100 font-semibold text-xs sm:text-sm tracking-tight">
              {selectedForDeletion.length} {selectedForDeletion.length === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
          </div>

          <button
            onClick={handleDone}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-medium transition-all active:scale-95 cursor-pointer"
          >
            <X size={14} />
            <span>Concluir</span>
          </button>
        </div>

        {/* Dynamic actions grid */}
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={handleSelectAllToggle}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all border cursor-pointer active:scale-95 ${
              isAllSelected 
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' 
                : 'bg-white/[0.06] hover:bg-white/10 text-zinc-200 border-white/10'
            }`}
          >
            <CheckSquare size={15} className="shrink-0" />
            <span className="truncate">
              {isAllSelected ? 'Desmarcar' : 'Todas'}
            </span>
          </button>

          <button 
            onClick={handleCleanDuplicatesTrigger}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white/[0.06] hover:bg-white/10 text-zinc-200 rounded-xl text-xs font-medium transition-all border border-white/10 cursor-pointer active:scale-95"
          >
            <CopyCheck size={15} className="shrink-0 text-zinc-400" />
            <span className="truncate">Duplicadas</span>
          </button>

          <button 
            onClick={() => setIsDeletingMultiple(true)} 
            disabled={selectedForDeletion.length === 0}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all border cursor-pointer active:scale-95 ${
              selectedForDeletion.length > 0
                ? 'bg-red-500/15 hover:bg-red-500/25 border-red-500/30 text-red-300'
                : 'bg-zinc-900/40 border-white/5 text-zinc-600 cursor-not-allowed opacity-40'
            }`}
          >
            <Trash2 size={15} className="shrink-0" />
            <span className="truncate">Excluir</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

