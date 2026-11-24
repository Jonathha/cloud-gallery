import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Reply, Copy, Check, Trash2, Loader2, X } from 'lucide-react';
import { ChatMessage } from './types';
import { getTimestampMs, formatMessageTime } from './chatTimeUtils';

interface ChatMessageDetailsModalProps {
  isOpen: boolean;
  message: ChatMessage | null;
  currentUserId?: string;
  isAdmin?: boolean;
  onClose: () => void;
  onReply?: (msg: ChatMessage) => void;
  onDeleteMessage?: (messageId: string) => Promise<boolean | void>;
}

export default function ChatMessageDetailsModal({
  isOpen,
  message,
  currentUserId,
  isAdmin,
  onClose,
  onReply,
  onDeleteMessage,
}: ChatMessageDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setCopied(false);
    setDeleteError(null);
  }, [message?.id, isOpen]);

  if (!isOpen || !message) return null;

  const isMe = message.userId === currentUserId;
  const typeLabel = { text: 'Texto', audio: 'Áudio', image: 'Imagem', video: 'Vídeo' }[message.mediaType as string] || 'Texto';
  const dateLabel = new Date(getTimestampMs(message.createdAt)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const rows: [string, string][] = [
    ['Enviado por', `${message.userName}${isMe ? ' (Você)' : ''}`],
    ['Data', dateLabel],
    ['Horário', formatMessageTime(message.createdAt)],
    ['Tipo', typeLabel],
  ];
  if (message.mediaType === 'audio') {
    if (message.audioDurationMs) rows.push(['Duração', `${Math.round(message.audioDurationMs / 1000)}s`]);
    if (message.audioSize) rows.push(['Tamanho', `${(message.audioSize / 1024).toFixed(1)} KB`]);
  }
  if (message.isPending) rows.push(['Status', 'Enviando']);
  if (message.hasError) rows.push(['Status', message.errorText || 'Falha no envio']);

  const handleCopy = async () => {
    const t = message.decryptedText ?? message.text ?? '';
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDelete = async () => {
    if (!message.id || !onDeleteMessage || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteMessage(message.id);
      onClose();
    } catch (err: any) {
      setDeleteError(err?.message || 'Falha ao excluir mensagem.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={isDeleting ? undefined : onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl p-4 shadow-2xl text-left overflow-hidden z-10 space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-200">
                {message.userName} {isMe ? '(Você)' : ''}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 text-xs text-zinc-300 max-h-24 overflow-y-auto whitespace-pre-wrap break-words">
            {message.decryptedText || (message.mediaType === 'audio' ? '[Áudio]' : '[Mensagem]')}
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            {rows.map(([k, v], i) => (
              <React.Fragment key={k + i}>
                <dt className="text-zinc-500">{k}</dt>
                <dd className="text-zinc-200 text-right break-words">{v}</dd>
              </React.Fragment>
            ))}
          </dl>

          {deleteError && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {deleteError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-2">
              {message.mediaType !== 'audio' && (message.decryptedText ?? message.text) && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              )}

              {onReply && !message.hasError && !message.isPending && (
                <button
                  type="button"
                  onClick={() => {
                    onReply(message);
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Reply className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Responder</span>
                </button>
              )}
            </div>

            {isAdmin && onDeleteMessage && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Excluir Mensagem</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
