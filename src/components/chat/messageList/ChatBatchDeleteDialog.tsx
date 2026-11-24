import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import type { ChatMessageListController } from './useChatMessageListController';

export default function ChatBatchDeleteDialog({ c }: { c: ChatMessageListController }) {
  const { selectedMessageIds } = c.selection;
  const { isBatchDeleting, batchDeleteError, setShowBatchDeleteConfirm, handleBatchDelete } = c.batch;
  const count = selectedMessageIds.size;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl p-4 shadow-2xl text-left z-10 space-y-3"
    >
      <h3 className="text-sm font-semibold text-white">Excluir mensagens</h3>
      <p className="text-xs text-zinc-400">
        Deseja excluir permanentemente {count} {count === 1 ? 'mensagem selecionada' : 'mensagens selecionadas'} e os arquivos associados? Esta ação não pode ser desfeita.
      </p>

      {batchDeleteError && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {batchDeleteError}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => setShowBatchDeleteConfirm(false)}
          disabled={isBatchDeleting}
          className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleBatchDelete}
          disabled={isBatchDeleting}
          className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isBatchDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Confirmar Exclusão</span>
        </button>
      </div>
    </motion.div>
  );
}
