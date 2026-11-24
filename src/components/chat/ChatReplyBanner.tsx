import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Reply } from 'lucide-react';
import { ChatMessage } from './types';
import { getReplyPreviewText } from './chatReplyPreview';

interface ChatReplyBannerProps {
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
}

export default function ChatReplyBanner({ replyingTo, onCancelReply }: ChatReplyBannerProps) {
  return (
    <AnimatePresence>
      {replyingTo && (
        <motion.div
          initial={{ opacity: 0, y: 10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: 10, height: 0 }}
          className="flex items-center justify-between bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-2"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Reply size={14} className="text-zinc-400 shrink-0" />
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-semibold text-zinc-300">
                Respondendo a {replyingTo.userName}
              </span>
              <span className="text-xs text-zinc-500 truncate">
                {getReplyPreviewText(replyingTo)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1.5 text-zinc-500 hover:text-white rounded-full hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
