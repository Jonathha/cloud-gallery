import React, { useRef, useState, useEffect } from 'react';
import { motion, useAnimation, PanInfo, useMotionValue, useTransform } from 'motion/react';
import { Reply, Loader2 } from 'lucide-react';
import { ChatMessage } from './types';
import ChatAudioPlayer from './ChatAudioPlayer';
import { REPLY_AUDIO_LABEL } from './chatReplyPreview';

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

function renderMessageText(text: string, isMe: boolean, onUrlClick: (url: string) => void) {
  return text.split(URL_REGEX).map((part, index) => {
    if (/^(https?:\/\/[^\s]+|www\.[^\s]+)$/i.test(part)) {
      const href = part.startsWith('www.') ? 'https://' + part : part;
      return (
        <a
          key={index}
          href={href}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUrlClick(href);
          }}
          className={`underline underline-offset-2 cursor-pointer font-medium hover:opacity-80 transition-opacity ${
            isMe ? 'text-blue-600' : 'text-blue-400'
          }`}
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

interface ChatMessageItemProps {
  msg: ChatMessage;
  isMe: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onReplyMessage?: (msg: ChatMessage) => void;
  onHoldMessage?: (msg: ChatMessage, anchor: HTMLElement) => void;
  onAdminLongHold?: (msg: ChatMessage) => void;
  onUrlClick: (url: string) => void;
  isAdmin?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (msg: ChatMessage) => void;
  onRetryFailedMessage?: (msg: ChatMessage) => void;
  onDismissFailedMessage?: (messageId: string) => void;
}

function ChatMessageItemComponent({
  msg,
  isMe,
  isFirstInGroup = true,
  isLastInGroup = true,
  onReplyMessage,
  onHoldMessage,
  onAdminLongHold,
  onUrlClick,
  isAdmin,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onRetryFailedMessage,
  onDismissFailedMessage,
}: ChatMessageItemProps) {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const replyOpacity = useTransform(x, [0, 20, 50], [0, 0.45, 1]);
  const replyScale = useTransform(x, [0, 20, 50], [0.6, 0.85, 1.05]);
  const replyX = useTransform(x, [0, 50], [-12, 6]);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const escalateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  // Toque longo já abriu menu/seleção: o clique que vem ao soltar não deve alterar a seleção
  const holdFiredRef = useRef(false);

  const clearHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (escalateTimerRef.current) clearTimeout(escalateTimerRef.current);
    holdTimerRef.current = null;
    escalateTimerRef.current = null;
    startPosRef.current = null;
    window.removeEventListener('pointerup', clearHold);
    window.removeEventListener('pointercancel', clearHold);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (isSelectionMode || msg.isPending || msg.hasError) return;
    if (!onHoldMessage) return;
    const anchor = e.currentTarget as HTMLElement;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    holdFiredRef.current = false;
    window.addEventListener('pointerup', clearHold, { once: true });
    window.addEventListener('pointercancel', clearHold, { once: true });
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      holdFiredRef.current = true;
      onHoldMessage(msg, anchor);
      if (isAdmin && onAdminLongHold) {
        // Admin: segurar até 3 s no total abre a seleção com "Excluir"
        escalateTimerRef.current = setTimeout(() => {
          escalateTimerRef.current = null;
          onAdminLongHold(msg);
        }, 2600);
      }
    }, 650);
  };

  useEffect(() => () => clearHold(), []);

  const onPointerMove = (e: React.PointerEvent) => {
    if (!startPosRef.current) return;
    if (Math.abs(e.clientX - startPosRef.current.x) > 6 || Math.abs(e.clientY - startPosRef.current.y) > 6) {
      clearHold();
    }
  };

  const onContextMenu = (e: React.MouseEvent) => {
    if (isSelectionMode || msg.isPending || msg.hasError) return;
    if (onHoldMessage) {
      e.preventDefault();
      onHoldMessage(msg, e.currentTarget as HTMLElement);
    }
  };

  const onDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isSelectionMode || msg.isPending || msg.hasError) return;
    clearHold();
    if (info.offset.x > 40 || x.get() > 40) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(15); } catch {}
      }
      onReplyMessage?.(msg);
    }
    controls.start({ x: 0, transition: { type: 'spring', stiffness: 220, damping: 24, mass: 0.8 } });
  };

  const onClickMessage = (e: React.MouseEvent) => {
    if (holdFiredRef.current) {
      holdFiredRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isSelectionMode && isAdmin && onToggleSelect) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect(msg);
    }
  };

  // Fluid bubble corner curvature based on sender and cluster position
  let rounding = 'rounded-2xl';
  if (isMe) {
    if (isFirstInGroup && isLastInGroup) {
      rounding = 'rounded-2xl rounded-br-sm';
    } else if (isFirstInGroup) {
      rounding = 'rounded-2xl rounded-br-md';
    } else if (isLastInGroup) {
      rounding = 'rounded-2xl rounded-tr-md rounded-br-sm';
    } else {
      rounding = 'rounded-2xl rounded-r-md';
    }
  } else {
    if (isFirstInGroup && isLastInGroup) {
      rounding = 'rounded-2xl rounded-bl-sm';
    } else if (isFirstInGroup) {
      rounding = 'rounded-2xl rounded-bl-md';
    } else if (isLastInGroup) {
      rounding = 'rounded-2xl rounded-tl-md rounded-bl-sm';
    } else {
      rounding = 'rounded-2xl rounded-l-md';
    }
  }

  const [showSlowIndicator, setShowSlowIndicator] = useState(false);

  useEffect(() => {
    if (!msg.isPending) {
      setShowSlowIndicator(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowSlowIndicator(true);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [msg.isPending]);

  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative group select-none`}>
      {/* Sender name only for other users on the first message of a cluster */}
      {!isMe && isFirstInGroup && (
        <span className="text-[11px] text-zinc-400/90 mb-1 px-1.5 font-semibold tracking-tight inline-flex items-center gap-1">
          {msg.userName}
          {(msg.userId === 'ia-assistant' || msg.userId === 'ai-assistant-system') && (
            <span className="inline-flex items-center" title="Verificado" aria-label="Verificado">
              <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0" aria-hidden="true">
                <path fill="#38bdf8" d="M12 2l2.4 1.9 3.1-.2.9 2.9 2.7 1.5-.6 3.1L22 12l-1.5 2.8.6 3.1-2.7 1.5-.9 2.9-3.1-.2L12 22l-2.4-1.9-3.1.2-.9-2.9-2.7-1.5.6-3.1L2 12l1.5-2.8-.6-3.1 2.7-1.5.9-2.9 3.1.2L12 2z" />
                <path fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.3l2.3 2.3 4.8-5.1" />
              </svg>
            </span>
          )}
        </span>
      )}

      {/* Swipe to reply visual feedback icon */}
      <motion.div
        style={{ opacity: replyOpacity, scale: replyScale, x: replyX }}
        className="absolute left-[-24px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-zinc-800/90 text-zinc-300 border border-white/10 flex items-center justify-center pointer-events-none z-0 shadow-md"
      >
        <Reply size={13} className="rotate-180" />
      </motion.div>

      <motion.div
        drag={!isSelectionMode && !msg.isPending && !msg.hasError ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 56 }}
        dragElastic={{ left: 0, right: 0.15 }}
        style={{ x }}
        onDragStart={clearHold}
        onDragEnd={onDragEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={clearHold}
        onPointerCancel={clearHold}
        onContextMenu={onContextMenu}
        onClick={onClickMessage}
        animate={controls}
        whileTap={{ scale: isSelectionMode ? 1 : 0.985 }}
        className={`max-w-[85%] sm:max-w-[70%] cursor-default relative touch-pan-y select-none px-3.5 py-2 transition-colors duration-150 ${rounding} ${
          isSelected
            ? 'ring-2 ring-red-500 bg-red-500/15 text-zinc-100 shadow-md'
            : isMe
            ? 'bg-white text-zinc-950 shadow-sm'
            : 'bg-zinc-900 text-zinc-100 border border-white/[0.08] shadow-sm'
        } ${msg.isPending ? 'opacity-95' : 'opacity-100'}`}
      >
        {isSelectionMode && isAdmin && (
          <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-white/40 flex items-center justify-center bg-zinc-950 shadow-sm z-10">
            {isSelected && <div className="w-3 h-3 rounded-full bg-red-500" />}
          </div>
        )}
        {/* Quoted reply preview */}
        {/* Respostas a áudio antigas foram salvas sem texto: mostra o rótulo de áudio */}
        {msg.replyToId && (
          <div
            className={`mb-2 pl-2.5 py-1 pr-2 rounded-r border-l-2 text-[11px] select-none transition-colors ${
              isMe
                ? 'bg-black/[0.06] border-black/60 text-zinc-800'
                : 'bg-white/[0.07] border-white/50 text-zinc-300'
            }`}
          >
            <div className={`font-semibold truncate max-w-[240px] sm:max-w-[320px] ${isMe ? 'text-black' : 'text-zinc-100'}`}>
              {msg.replyToUserName || 'Mensagem'}
            </div>
            <div className="truncate max-w-[240px] sm:max-w-[320px] opacity-80">
              {msg.decryptedReplyTo || msg.replyToText || REPLY_AUDIO_LABEL}
            </div>
          </div>
        )}

        {/* Message Content: Audio or Text */}
        {msg.mediaType === 'audio' ? (
          <div className="flex flex-col w-[230px] sm:w-[260px] max-w-full">
            <ChatAudioPlayer msg={msg} isMe={isMe} />
            {msg.isPending && showSlowIndicator && (
              <div className={`flex items-center justify-end mt-1 px-1 select-none ${isMe ? 'text-black/40' : 'text-zinc-400/60'}`}>
                <Loader2 size={12} className="animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="break-words [overflow-wrap:anywhere] [word-break:break-word] text-[14.5px] leading-relaxed select-none">
            {renderMessageText(msg.decryptedText || msg.text || '[Mensagem]', isMe, onUrlClick)}
            {msg.isPending && showSlowIndicator && (
              <span className={`inline-flex items-center ml-2 align-middle select-none ${isMe ? 'text-black/40' : 'text-zinc-400/60'}`}>
                <Loader2 size={12} className="animate-spin" />
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Error State */}
      {msg.hasError && (
        <div className="flex items-center gap-1.5 mt-1 px-1.5 select-none">
          <span
            className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-[10px] flex items-center justify-center shrink-0 leading-none shadow-sm cursor-help"
            title={msg.errorText || 'Erro no envio'}
          >
            !
          </span>
          <span className="text-red-400 text-[11px] font-medium leading-none">
            {msg.errorText || 'Falha no envio'}
          </span>
          {onRetryFailedMessage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetryFailedMessage(msg);
              }}
              className="text-[11px] text-zinc-300 hover:text-white underline underline-offset-2 ml-1 cursor-pointer transition-colors"
            >
              Tentar novamente
            </button>
          )}
          {onDismissFailedMessage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismissFailedMessage(msg.id);
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 ml-1 cursor-pointer transition-colors"
              title="Descartar mensagem com erro"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(ChatMessageItemComponent);
