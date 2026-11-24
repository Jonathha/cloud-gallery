import { AnimatePresence, motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import type { ChatMessageListController } from './useChatMessageListController';

export default function ChatBatchActionBar({ c }: { c: ChatMessageListController }) {
  const { isAdmin } = c.props;
  const { isSelectionMode, selectedMessageIds, handleCancelSelection } = c.selection;
  const { isBatchDeleting, setShowBatchDeleteConfirm } = c.batch;

  return (
    <AnimatePresence>
      {isAdmin && isSelectionMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          style={{ bottom: 'calc(var(--chat-input-h, 0px) + 1rem)' }}
          className="absolute left-4 right-4 z-30 bg-zinc-950/95 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between text-white"
        >
          <div className="flex items-center gap-2 px-2">
            <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center">
              {selectedMessageIds.size}
            </span>
            <span className="text-xs font-medium text-zinc-200">
              {selectedMessageIds.size} {selectedMessageIds.size === 1 ? 'mensagem selecionada' : 'mensagens selecionadas'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelSelection}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => setShowBatchDeleteConfirm(true)}
              disabled={selectedMessageIds.size === 0 || isBatchDeleting}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
