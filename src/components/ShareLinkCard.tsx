import React from 'react';
import { motion } from 'motion/react';
import { Check, Copy, Download, Eye, Lock, Unlock } from 'lucide-react';
import TrashIcon from './icons/TrashIcon';
import ShareButton from './ShareButton';
import ShareSpinner from './ShareSpinner';
import { formatRemaining, msUntilExpiry } from '../hooks/share/shareConstants';

interface ShareLinkCardProps {
  share: any;
  now: number;
  copied: boolean;
  /** Clipboard failed: show the full link in a selectable field instead of the masked one. */
  manualCopy: boolean;
  deleting: boolean;
  onCopy: () => void;
  /** Receives the clicked button so focus can return to it if the user keeps the link. */
  onDelete: (trigger: HTMLElement) => void;
}

function Chip({ icon, tone = 'neutral', children }: { icon: React.ReactNode; tone?: 'neutral' | 'amber'; children: React.ReactNode }) {
  const palette = tone === 'amber'
    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
    : 'bg-zinc-950/80 border-zinc-800 text-zinc-400';
  return (
    <span className={`inline-flex items-center gap-1 h-5.5 px-2 rounded-md border text-[11px] font-medium ${palette}`}>
      {icon}{children}
    </span>
  );
}

/** One active share link: status, time left, masked URL, copy and delete actions. */
export default function ShareLinkCard({ share, now, copied, manualCopy, deleting, onCopy, onDelete }: ShareLinkCardProps) {
  const options = share?.options || {};
  const oneTime = !!options.oneTimeView;
  const allowDownload = options.allowDownload !== false && !oneTime;
  const hasPassword = !!options.requirePassword;
  const linkUrl: string = share.finalUrl || `${window.location.origin}/?share=${share.id}`;
  // The part after "#" carries the decryption key: it is copied but never displayed.
  const visibleUrl = linkUrl.replace(/^https?:\/\//, '').split('#')[0];

  const remaining = msUntilExpiry(share, now);
  const expired = remaining !== null && remaining <= 0;
  const expiresAt = Number(options.expiresAt || share?.expiresAt || 0);
  const createdAt = Number(share?.createdAt) || 0;
  const span = expiresAt && createdAt && expiresAt > createdAt ? expiresAt - createdAt : 3_600_000;
  const fraction = remaining === null ? 0 : Math.min(1, Math.max(0, remaining / span));

  const statusDotClass = expired ? 'bg-zinc-500' : oneTime ? 'bg-amber-400' : 'bg-emerald-400';
  const statusBadgeClass = expired
    ? 'bg-zinc-800/40 text-zinc-400 border-zinc-800'
    : oneTime
    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
    : 'bg-zinc-800/60 text-zinc-300 border-zinc-700/50';

  const statusText = expired ? 'Expirado' : 'Ativo';
  const timeText = remaining !== null
    ? formatRemaining(remaining)
    : oneTime ? 'Expira 1 min após abrir' : 'Sem prazo de validade';

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="pb-2.5 list-none"
    >
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/70 p-3 sm:p-3.5 flex flex-col gap-2.5 transition-colors">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusBadgeClass}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
            {statusText}
          </span>
          <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">{timeText}</span>
        </div>

        {remaining !== null && !expired && (
          <div aria-hidden="true" className="h-1 rounded-full bg-zinc-800/80 overflow-hidden -mt-0.5">
            <div
              className={`h-full w-full origin-left rounded-full transition-transform duration-500 ${
                fraction < 0.15 ? 'bg-amber-400' : 'bg-zinc-400'
              }`}
              style={{ transform: `scaleX(${fraction})` }}
            />
          </div>
        )}

        {manualCopy ? (
          <input
            type="text"
            readOnly
            autoFocus
            aria-label="Link de compartilhamento completo"
            value={linkUrl}
            onFocus={e => e.currentTarget.select()}
            className="w-full h-8.5 rounded-lg bg-zinc-950 border border-zinc-700 px-2.5 font-mono text-xs text-zinc-200 select-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          />
        ) : (
          <div className="w-full h-8.5 flex items-center gap-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 px-2.5">
            <Lock size={12} className="shrink-0 text-zinc-500" aria-hidden="true" />
            <span
              className="truncate font-mono text-xs text-zinc-400"
              title="A chave de descriptografia vai junto ao copiar, mas não é exibida."
            >
              {visibleUrl}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Chip icon={hasPassword ? <Lock size={11} /> : <Unlock size={11} />}>
            {hasPassword ? 'Com senha' : 'Sem senha'}
          </Chip>
          {oneTime ? (
            <Chip tone="amber" icon={<Eye size={11} />}>Visualização única</Chip>
          ) : (
            <Chip icon={<Download size={11} />}>{allowDownload ? 'Download liberado' : 'Sem download'}</Chip>
          )}
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <ShareButton
            variant={copied ? 'secondary' : 'primary'}
            size="sm"
            onClick={onCopy}
            aria-label="Copiar link de compartilhamento"
            className="flex-1"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" strokeWidth={2.5} />
                <span className="text-zinc-200">Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copiar link</span>
              </>
            )}
          </ShareButton>
          <ShareButton
            variant="ghostDanger"
            size="sm"
            onClick={e => onDelete(e.currentTarget)}
            disabled={deleting}
            aria-label={deleting ? 'Excluindo link' : 'Excluir link de compartilhamento'}
          >
            {deleting ? <ShareSpinner size="sm" /> : <TrashIcon size={13} />}
            <span>{deleting ? 'Excluindo…' : 'Excluir'}</span>
          </ShareButton>
        </div>
        <span role="status" className="sr-only">{copied ? 'Link copiado.' : ''}</span>
      </div>
    </motion.li>
  );
}
