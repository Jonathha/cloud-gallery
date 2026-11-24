import { AnimatePresence, motion } from 'motion/react';
import ChatBatchDeleteDialog from './ChatBatchDeleteDialog';
import type { ChatMessageListController } from './useChatMessageListController';

export default function ChatBatchDeleteModal({ c }: { c: ChatMessageListController }) {
  const { showBatchDeleteConfirm, setShowBatchDeleteConfirm, isBatchDeleting } = c.batch;

  return (
    <AnimatePresence>
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isBatchDeleting ? undefined : () => setShowBatchDeleteConfirm(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <ChatBatchDeleteDialog c={c} />
        </div>
      )}
    </AnimatePresence>
  );
}
