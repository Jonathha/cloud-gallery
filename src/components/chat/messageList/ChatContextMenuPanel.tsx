import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Info, Copy, Check } from 'lucide-react';
import type { ChatMessage } from '../types';
import { computeMenuPosition, type MenuPosition } from './chatContextMenuPosition';

interface ChatContextMenuPanelProps {
  message: ChatMessage;
  anchor: HTMLElement;
  alignRight: boolean;
  onClose: () => void;
  onDetails: (msg: ChatMessage) => void;
}

const itemClass =
  'w-full min-h-[36px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-200 text-left hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer';

export default function ChatContextMenuPanel({ message, anchor, alignRight, onClose, onDetails }: ChatContextMenuPanelProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<MenuPosition | null>(null);
  const [copied, setCopied] = useState(false);
  const text = message.decryptedText ?? message.text ?? '';
  const canCopy = !['audio', 'image', 'video'].includes(message.mediaType as string) && text.trim().length > 0;

  // Posiciona antes da pintura e acompanha a mensagem ao rolar/redimensionar
  useLayoutEffect(() => {
    const place = () => {
      const el = menuRef.current;
      if (!el || !anchor.isConnected) return onClose();
      const p = computeMenuPosition(anchor.getBoundingClientRect(), el.offsetWidth, el.offsetHeight, alignRight);
      if (!p) return onClose();
      setPos(p);
    };
    place();
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };
    const vv = window.visualViewport;
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    vv?.addEventListener('resize', schedule);
    vv?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      vv?.removeEventListener('resize', schedule);
      vv?.removeEventListener('scroll', schedule);
    };
  }, [anchor, alignRight, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Confirmação discreta e fechamento automático após copiar
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(onClose, 900);
    return () => clearTimeout(t);
  }, [copied, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {}
  };

  return (
    <>
    {/* Toque fora fecha o menu sem disparar ações da mensagem */}
    <div className="fixed inset-0 z-[90]" aria-hidden="true" onPointerDown={onClose} />
    <motion.div
      ref={menuRef}
      role="menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
      className="fixed z-[95] min-w-[168px] rounded-xl bg-zinc-900 border border-white/10 shadow-xl shadow-black/50 p-1"
    >
      {canCopy && (
        <button type="button" role="menuitem" onClick={handleCopy} className={itemClass}>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      )}
      <button type="button" role="menuitem" onClick={() => onDetails(message)} className={itemClass}>
        <Info className="w-3.5 h-3.5 text-zinc-400" />
        <span>Ver detalhes</span>
      </button>
    </motion.div>
    </>
  );
}
