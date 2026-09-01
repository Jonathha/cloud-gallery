import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { isNativeApp } from "../utils/isNativeApp";
import { Trash2, RefreshCw, Loader2 } from 'lucide-react';
import DeleteMediaModal from './DeleteMediaModal';
import Toast from './Toast';
import ExtraPasswordPrompt from './ExtraPasswordPrompt';
import { useTrashLogic } from '../hooks/useTrashLogic';
import TrashGrid from './trash/TrashGrid';
import TrashActionOverlay from './trash/TrashActionOverlay';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean;
  onLightboxToggle?: (isOpen: boolean) => void;
}

export default function TrashModal({ isOpen, onClose, isInline, onLightboxToggle }: TrashModalProps) {
  const isApp = isNativeApp();
  const t = useTrashLogic(isOpen);

  React.useEffect(() => {
    onLightboxToggle?.(t.selectedImage !== null);
  }, [t.selectedImage, onLightboxToggle]);

  const content = (
    <div className={`flex flex-col bg-[#050505] ${isInline ? 'h-full w-full' : 'fixed inset-0 z-[70]'}`}>
      {t.toast && (
        <Toast 
          message={t.toast.message} 
          type={t.toast.type} 
          onClose={() => t.setToast(null)} 
        />
      )}

      <DeleteMediaModal
        isOpen={t.isConfirmEmptyOpen}
        onClose={() => t.setIsConfirmEmptyOpen(false)}
        onConfirm={t.handleEmptyTrash}
        title="Esvaziar lixeira?"
        message="Esta ação excluirá permanentemente todos os itens da lixeira."
        confirmText="Esvaziar"
        cancelText="Cancelar"
      />

      <DeleteMediaModal
        isOpen={t.isConfirmDeleteOpen}
        onClose={() => t.setIsConfirmDeleteOpen(false)}
        onConfirm={() => t.selectedImage && t.handleDeletePermanently(t.selectedImage)}
        title="Excluir permanentemente?"
        message="Esta mídia será excluída sem possibilidade de recuperação."
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      {/* Header */}
      <header 
        style={{ paddingTop: isApp ? '2.5rem' : 'calc(0.5rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.5rem' }}
        className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-3 sm:px-6 min-h-14 sm:min-h-20 flex items-center justify-between"
      >
        <div>
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white">
            {t.selectedIds.length > 0 ? `${t.selectedIds.length} selecionados` : 'Lixeira Local'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium">
            {t.selectedIds.length > 0 ? 'Opções de exclusão ou restauração em lote' : `${t.images.length} itens removidos`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {t.selectedIds.length > 0 ? (
            <button
              onClick={() => t.setSelectedIds([])}
              className="text-zinc-400 hover:text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
            >
              Cancelar
            </button>
          ) : t.images.length > 0 && (
            <button
              onClick={t.triggerEmptyTrash}
              className="text-red-400 hover:text-red-300 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/10"
            >
              Esvaziar
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28">
        {t.loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
          </div>
        ) : t.images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4 py-20">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5">
              <Trash2 size={28} className="text-zinc-600" />
            </div>
            <p className="text-base font-semibold text-white">A lixeira está vazia</p>
            <p className="text-sm text-center max-w-xs text-zinc-500">
              Imagens excluídas da Cloud Gallery aparecerão aqui e poderão ser restauradas.
            </p>
          </div>
        ) : (
          <TrashGrid
            images={t.images}
            selectedIds={t.selectedIds}
            handleSelectImage={t.handleSelectImage}
            securityImageId={t.securityImageId}
            isExtraUnlocked={t.isExtraUnlocked}
            extraPassword={t.extraPassword}
          />
        )}
      </main>

      {/* Multiple Selection Bar */}
      <AnimatePresence>
        {t.selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className={`fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 p-4 sm:p-6 flex items-center justify-between z-[90] gap-4 ${isInline ? 'lg:left-64' : ''}`}
            style={{ paddingBottom: isApp ? '1rem' : 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg">{t.selectedIds.length} selecionados</span>
              <button 
                onClick={() => t.setSelectedIds(t.images.map(i => i.id))}
                className="text-xs text-zinc-500 hover:text-white transition-colors text-left"
              >
                Selecionar tudo
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={t.handleRestoreMultiple}
                disabled={t.isRestoring || t.isDeleting}
                className="px-4 py-2.5 bg-white text-black font-bold rounded-xl flex items-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 text-sm"
              >
                {t.isRestoring ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                Restaurar
              </button>
              <button
                onClick={() => t.setIsConfirmDeleteMultipleOpen(true)}
                disabled={t.isRestoring || t.isDeleting}
                className="px-4 py-2.5 bg-red-500/10 text-red-500 font-bold rounded-xl flex items-center gap-2 hover:bg-red-500/20 transition-colors border border-red-500/20 disabled:opacity-50 text-sm"
              >
                <Trash2 size={18} />
                Excluir
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteMediaModal
        isOpen={t.isConfirmDeleteMultipleOpen}
        onClose={() => t.setIsConfirmDeleteMultipleOpen(false)}
        onConfirm={t.handleDeleteMultiple}
        title={`Excluir ${t.selectedIds.length} itens?`}
        message="Os itens selecionados serão excluídos permanentemente."
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      {/* Image Action Modal */}
      <TrashActionOverlay
        selectedImage={t.selectedImage}
        setSelectedImage={t.setSelectedImage}
        handleRestore={t.handleRestore}
        setIsConfirmDeleteOpen={t.setIsConfirmDeleteOpen}
        isRestoring={t.isRestoring}
        isDeleting={t.isDeleting}
      />

      <ExtraPasswordPrompt
        isOpen={t.isPromptingExtra !== null}
        extraPasswordInput={t.extraPasswordInput}
        setExtraPasswordInput={t.setExtraPasswordInput}
        onClose={() => t.setIsPromptingExtra(null)}
        onSubmit={t.handleExtraPasswordSubmit}
      />
    </div>
  );

  if (isInline) return content;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col bg-[#050505]"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
