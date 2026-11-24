import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link2, ArrowLeft, Check, Cloud } from 'lucide-react';
import TrashIcon from './icons/TrashIcon';
import ShareButton from './ShareButton';
import ShareSpinner from './ShareSpinner';
import { describeShare } from '../hooks/share/shareConstants';

interface ShareLimitModalProps {
  /** Active links of the whole account; null until the user asks to see them. */
  shares: any[] | null;
  loading: boolean;
  loadError: string;
  error: string;
  onLoad: () => void;
  maxLinks: number;
  busy: boolean;
  onClose: () => void;
  onDelete: (ids: string[]) => Promise<number>;
}

function shortLink(share: any) {
  const id = String(share?.id || '');
  return `…/?share=${id.slice(0, 8)}…${id.slice(-4)}`;
}

/** Shown when the account already has the maximum of links; the list (all media) only loads when the user asks for it. */
export default function ShareLimitModal({
  shares,
  loading,
  loadError,
  error,
  onLoad,
  maxLinks,
  busy,
  onClose,
  onDelete
}: ShareLimitModalProps) {
  const [view, setView] = useState<'intro' | 'list'>('intro');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { primaryRef.current?.focus(); }, [view]);
  useEffect(() => {
    setSelected(prev => new Set([...prev].filter(id => (shares || []).some(s => s.id === id))));
  }, [shares]);

  const toggle = (id: string) => {
    setConfirming(false);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runDelete = async () => {
    const ids = [...selected];
    setConfirming(false);
    await onDelete(ids);
  };

  return (
    <motion.div
      data-share-overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="share-limit-title"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm max-h-[85vh] overflow-y-auto bg-[#141418] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 text-left"
      >
        <AnimatePresence mode="wait" initial={false}>
          {view === 'intro' ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center text-center gap-3.5"
            >
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Link2 size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <h4 id="share-limit-title" className="text-base font-semibold text-white">
                  Limite de {maxLinks} links atingido
                </h4>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Você já tem {maxLinks} links ativos na sua conta. Exclua um para criar outro.
                </p>
              </div>
              <div className="flex gap-1.5" aria-hidden="true">
                {Array.from({ length: maxLinks }, (_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-6 rounded-full bg-amber-400/80"
                  />
                ))}
              </div>
              <div className="flex flex-col gap-2 w-full pt-1">
                <ShareButton
                  ref={primaryRef}
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setView('list');
                    onLoad();
                  }}
                  className="w-full"
                >
                  <Cloud size={14} /> Ver meus links
                </ShareButton>
                <ShareButton variant="secondary" size="md" onClick={onClose} className="w-full">
                  Agora não
                </ShareButton>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <ShareButton
                  variant="ghost"
                  size="icon"
                  onClick={() => { setView('intro'); setConfirming(false); }}
                  disabled={busy}
                  aria-label="Voltar"
                  className="-ml-1"
                >
                  <ArrowLeft size={16} />
                </ShareButton>
                <div className="min-w-0">
                  <h4 id="share-limit-title" className="text-sm sm:text-base font-semibold text-white">
                    Links ativos na nuvem
                  </h4>
                  <p className="text-[11px] sm:text-xs text-zinc-500">
                    {shares ? `${shares.length} ${shares.length === 1 ? 'link ativo' : 'links ativos'} · selecione para excluir` : 'Todos os links da sua conta'}
                  </p>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-xs text-red-300 text-left">{error}</p>
              )}

              {loadError ? (
                <div role="alert" className="flex flex-col items-center gap-2.5 py-3 text-center">
                  <p className="text-xs sm:text-sm text-zinc-300">{loadError}</p>
                  <ShareButton variant="secondary" size="sm" onClick={onLoad}>
                    Tentar novamente
                  </ShareButton>
                </div>
              ) : !shares || loading ? (
                <div role="status" className="flex flex-col items-center justify-center gap-2.5 py-6 text-xs sm:text-sm text-zinc-400">
                  <ShareSpinner size="lg" />
                  <span>Carregando seus links…</span>
                </div>
              ) : shares.length === 0 ? (
                <p className="text-xs sm:text-sm text-zinc-300 text-center py-3">
                  Nenhum link ativo encontrado. Feche e tente criar o link de novo.
                </p>
              ) : (
                <>
                  <ul className="flex flex-col gap-1.5" aria-label="Links de compartilhamento">
                    {shares.map(share => {
                      const info = describeShare(share);
                      const isSelected = selected.has(share.id);
                      return (
                        <li key={share.id}>
                          <label
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-colors ${
                              isSelected
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80'
                            } ${busy ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isSelected}
                              disabled={busy}
                              onChange={() => toggle(share.id)}
                            />
                            <span
                              aria-hidden="true"
                              className={`mt-0.5 h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'bg-red-500 border-red-500 text-white' : 'bg-zinc-900 border-zinc-700'
                              }`}
                            >
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-xs font-mono text-zinc-300 truncate">{shortLink(share)}</span>
                              <span className="text-[11px] text-zinc-500">
                                Criado em {new Date(Number(share.createdAt) || Date.now()).toLocaleDateString()}
                              </span>
                              <span className="text-[11px] text-zinc-400">
                                {info.passwordLabel} · {info.accessLabel} · {info.expiresLabel}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>

                  {confirming ? (
                    <div role="alert" className="flex flex-col gap-2 p-2.5 rounded-xl bg-red-950/25 border border-red-900/40">
                      <p className="text-xs text-red-200">
                        Excluir {selected.size} {selected.size === 1 ? 'link' : 'links'}? Quem recebeu não conseguirá mais abrir.
                      </p>
                      <div className="flex gap-2">
                        <ShareButton variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={busy} className="flex-1">
                          Cancelar
                        </ShareButton>
                        <ShareButton ref={primaryRef} variant="danger" size="sm" onClick={runDelete} disabled={busy} className="flex-1">
                          {busy ? (
                            <>
                              <ShareSpinner size="sm" /> Excluindo…
                            </>
                          ) : (
                            <>
                              <TrashIcon size={12} /> Confirmar
                            </>
                          )}
                        </ShareButton>
                      </div>
                    </div>
                  ) : (
                    <ShareButton
                      variant="danger"
                      size="md"
                      onClick={() => setConfirming(true)}
                      disabled={selected.size === 0 || busy}
                      className="w-full"
                    >
                      <TrashIcon size={13} />
                      <span>
                        {selected.size > 0
                          ? `Excluir ${selected.size} ${selected.size === 1 ? 'selecionado' : 'selecionados'}`
                          : 'Selecione links para excluir'}
                      </span>
                    </ShareButton>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
