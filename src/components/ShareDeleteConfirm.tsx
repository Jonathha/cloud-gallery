import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import TrashIcon from './icons/TrashIcon';
import ShareButton from './ShareButton';
import ShareSpinner from './ShareSpinner';
import { shortShareLink } from '../hooks/share/shareConstants';

interface ShareDeleteConfirmProps {
  share: any;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** In-app confirmation shown before a share link is deleted. Keeping the link is the default action. */
export default function ShareDeleteConfirm({ share, busy, onCancel, onConfirm }: ShareDeleteConfirmProps) {
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { keepRef.current?.focus(); }, []);

  return (
    <motion.div
      data-share-overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-3 sm:p-4"
      onClick={busy ? undefined : onCancel}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="share-delete-title"
        aria-describedby="share-delete-desc"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-[#141418] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 text-left flex flex-col gap-3.5"
      >
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <TrashIcon size={16} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <h4 id="share-delete-title" className="text-sm sm:text-base font-semibold text-white">
              Excluir este link?
            </h4>
            <p id="share-delete-desc" className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Quem recebeu o link não conseguirá mais abrir a mídia.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-zinc-950/80 border border-zinc-800/80 px-2.5 py-1.5 font-mono text-xs text-zinc-300 truncate" title="Link que será excluído">
          {shortShareLink(share)}
        </div>

        <div className="flex gap-2.5 pt-1">
          <ShareButton ref={keepRef} variant="secondary" size="md" onClick={onCancel} disabled={busy} className="flex-1">
            Manter link
          </ShareButton>
          <ShareButton variant="danger" size="md" onClick={onConfirm} disabled={busy} className="flex-1">
            {busy ? (
              <>
                <ShareSpinner size="sm" /> Excluindo…
              </>
            ) : (
              <>
                <TrashIcon size={13} /> Excluir link
              </>
            )}
          </ShareButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
