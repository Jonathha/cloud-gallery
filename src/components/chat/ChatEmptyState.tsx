import React from 'react';
import { MessageSquare } from 'lucide-react';
import Spinner from '../Spinner';

/**
 * Loading state spinner displayed while chat messages are initialising.
 */
export function ChatLoadingState() {
  return (
    <div className="h-full flex items-center justify-center">
      <Spinner size={28} label="Carregando mensagens" />
    </div>
  );
}

/**
 * Empty state indicator displayed when no messages exist in the room.
 */
export function ChatEmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2 p-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-1">
        <MessageSquare size={24} className="opacity-30 text-zinc-400" />
      </div>
      <p className="text-xs font-medium text-zinc-400">
        Nenhuma mensagem no chat ainda.
      </p>
      <p className="text-[11px] text-zinc-500 max-w-[200px] leading-relaxed">
        Seja o primeiro a enviar uma mensagem criptografada!
      </p>
    </div>
  );
}

export default ChatEmptyState;
