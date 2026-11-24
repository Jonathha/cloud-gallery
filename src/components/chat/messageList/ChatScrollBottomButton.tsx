import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ChatMessageListController } from './useChatMessageListController';

export default function ChatScrollBottomButton({ c }: { c: ChatMessageListController }) {
  const { showScrollBottom, scrollToBottom } = c.scroll;

  return (
    <AnimatePresence>
      {showScrollBottom && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          onClick={() => scrollToBottom('smooth')}
          aria-label="Rolar para as mensagens mais recentes"
          style={{ bottom: 'calc(var(--chat-input-h, 4.25rem) + 0.75rem)' }}
          className="absolute right-4 sm:right-6 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 shadow-xl shadow-black/60 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
