import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { X, Share2, AlertTriangle, Link2, RefreshCw } from 'lucide-react';
import { useShareLogic } from '../hooks/useShareLogic';
import ShareConfigForm from './ShareConfigForm';
import ShareLimitModal from './ShareLimitModal';
import ShareDeleteConfirm from './ShareDeleteConfirm';
import ShareLinkCard from './ShareLinkCard';
import ShareButton from './ShareButton';
import ShareSpinner from './ShareSpinner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageId: string;
  decryptedImageUrl: string;
}

export default function ShareModal({ isOpen, onClose, imageId, decryptedImageUrl }: ShareModalProps) {
  const s = useShareLogic(isOpen, imageId, decryptedImageUrl, onClose);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [manualCopyId, setManualCopyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const limitOpenRef = useRef(false);
  limitOpenRef.current = s.limitOpen;
  const deleteTargetRef = useRef<any | null>(null);
  deleteTargetRef.current = deleteTarget;
  const deletingRef = useRef<string | null>(null);
  deletingRef.current = s.deletingId;
  const deleteTriggerRef = useRef<HTMLElement | null>(null);

  /** Closes the delete confirmation and puts focus back on the button that opened it. */
  const cancelDelete = () => {
    setDeleteTarget(null);
    window.requestAnimationFrame(() => {
      const trigger = deleteTriggerRef.current;
      if (trigger?.isConnected) trigger.focus();
    });
  };
  const cancelDeleteRef = useRef(cancelDelete);
  cancelDeleteRef.current = cancelDelete;

  const overlayOpen = s.limitOpen || !!deleteTarget;

  // Keeps the "expires in" labels and time bars fresh while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDeleteTarget(null);
      setManualCopyId(null);
      setCopiedId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (deleteTargetRef.current) {
          if (!deletingRef.current) cancelDeleteRef.current();
        } else if (limitOpenRef.current) {
          s.setLimitOpen(false);
        } else {
          onClose();
        }
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const scope = dialogRef.current.querySelector<HTMLElement>('[data-share-overlay]') ?? dialogRef.current;
      const items = Array.from(scope.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )).filter(item => item.offsetParent !== null && !item.closest('[inert]'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!scope.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const active = document.activeElement;
    if (!active || active === document.body || !dialogRef.current.contains(active)) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen, s.showCreateForm, s.existingShares.length, deleteTarget]);

  if (!isOpen) return null;

  const handleCopyLink = async (link: string, id: string) => {
    setManualCopyId(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível.');
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(current => current === id ? null : current), 2000);
    } catch {
      setManualCopyId(id);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await s.handleDeleteShare(deleteTarget.id);
    setDeleteTarget(null);
  };

  const used = s.existingShares.length;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 select-none"
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#101014] border border-white/10 rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl relative max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col"
        >
          {/* Header */}
          <div inert={overlayOpen} className="px-4 sm:px-5 py-3.5 border-b border-zinc-800/80 flex justify-between items-center gap-3 bg-zinc-900/40 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-300" aria-hidden="true">
                <Share2 size={15} />
              </div>
              <div className="min-w-0 text-left">
                <h3 id="share-modal-title" className="font-semibold text-sm sm:text-base text-white leading-tight tracking-tight">
                  Compartilhar mídia
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                  Acesso público protegido por criptografia de ponta a ponta.
                </p>
              </div>
            </div>
            <ShareButton
              ref={closeButtonRef}
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Fechar compartilhamento"
              className="-mr-1 shrink-0 h-7.5 w-7.5"
            >
              <X size={16} />
            </ShareButton>
          </div>

          {/* Body Content */}
          <div inert={overlayOpen} className="p-4 sm:p-5 flex flex-col gap-3.5 overflow-y-auto overscroll-contain min-h-0">
            {s.error && (
              <div role="alert" className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-xl flex gap-2 items-start text-red-300 text-xs text-left">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-400" />
                <span>{s.error}</span>
              </div>
            )}

            {s.checking && (
              <div role="status" className="flex flex-col items-center justify-center gap-2.5 py-8 text-xs sm:text-sm text-zinc-400">
                <ShareSpinner size="lg" />
                <span>Consultando links de compartilhamento…</span>
              </div>
            )}

            {s.checkFailed && !s.checking && (
              <div className="flex flex-col items-center gap-2.5 py-4 text-center">
                <p className="text-xs sm:text-sm text-zinc-300">
                  Não foi possível confirmar seus links atuais. Tente de novo antes de criar outro.
                </p>
                <ShareButton variant="secondary" size="sm" onClick={s.refreshShares}>
                  <RefreshCw size={13} /> Tentar novamente
                </ShareButton>
              </div>
            )}

            {!s.checking && !s.checkFailed && used > 0 && (
              <section className="flex flex-col" aria-labelledby="share-active-title">
                <div className="flex items-center gap-2 mb-2.5 text-left">
                  <Link2 size={13} className="text-zinc-400 shrink-0" aria-hidden="true" />
                  <h4 id="share-active-title" className="text-xs sm:text-sm font-semibold text-zinc-200">
                    {used > 1 ? 'Links ativos' : 'Link ativo'}
                  </h4>
                  {s.refreshing && (
                    <span className="flex items-center gap-1 text-[11px] text-zinc-500 ml-auto">
                      <ShareSpinner size="sm" label="Atualizando links" />
                    </span>
                  )}
                </div>

                <ul aria-labelledby="share-active-title" className="flex flex-col">
                  {s.existingShares.map((share: any, idx: number) => (
                    <ShareLinkCard
                      key={share.id || idx}
                      share={share}
                      now={now}
                      copied={copiedId === share.id}
                      manualCopy={manualCopyId === share.id}
                      deleting={s.deletingId === share.id}
                      onCopy={() => handleCopyLink(share.finalUrl || `${window.location.origin}/?share=${share.id}`, share.id)}
                      onDelete={trigger => {
                        deleteTriggerRef.current = trigger;
                        setDeleteTarget(share);
                      }}
                    />
                  ))}
                </ul>

                {manualCopyId && (
                  <p role="status" className="text-xs text-amber-300 -mt-1 mb-2 text-left">
                    Não foi possível copiar automaticamente. Selecione o link acima e copie.
                  </p>
                )}
              </section>
            )}

            {!s.checking && !s.checkFailed && s.showCreateForm && used === 0 && (
              <div key="create-form">
                {used > 0 && (
                  <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 text-left mb-2.5">
                    Novo link
                  </h4>
                )}
                <ShareConfigForm
                  linkDuration={s.linkDuration}
                  setLinkDuration={s.setLinkDuration}
                  requirePassword={s.requirePassword}
                  setRequirePassword={s.setRequirePassword}
                  password={s.password}
                  setPassword={s.setPassword}
                  allowDownload={s.allowDownload}
                  setAllowDownload={s.setAllowDownload}
                  oneTimeView={s.oneTimeView}
                  setOneTimeView={s.setOneTimeView}
                  loading={s.loading}
                  checking={s.checking}
                  onClose={used > 0 ? () => s.setShowCreateForm(false) : onClose}
                  onGenerate={s.handleGenerateShare}
                />
              </div>
            )}
          </div>

          {/* Modals & Overlays */}
          <AnimatePresence>
            {s.limitOpen && (
              <ShareLimitModal
                key="limit"
                shares={s.accountShares}
                loading={s.accountLoading}
                loadError={s.accountError}
                error={s.error}
                onLoad={s.loadAccountShares}
                maxLinks={s.maxLinks}
                busy={s.bulkDeleting}
                onClose={() => s.setLimitOpen(false)}
                onDelete={s.handleDeleteMany}
              />
            )}
            {deleteTarget && (
              <ShareDeleteConfirm
                key="delete"
                share={deleteTarget}
                busy={s.deletingId === deleteTarget.id}
                onCancel={cancelDelete}
                onConfirm={confirmDelete}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
