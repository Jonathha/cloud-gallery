import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Loader2, Check, AlertTriangle } from 'lucide-react';

interface TrashPermanentDeleteModalProps {
  isOpen: boolean;
  current: number;
  total: number;
  isAll?: boolean;
  failed?: number;
  photos?: number;
  videos?: number;
  finished?: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function TrashPermanentDeleteModal({
  isOpen,
  current,
  total,
  isAll,
  failed = 0,
  photos = 0,
  videos = 0,
  finished = false,
}: TrashPermanentDeleteModalProps) {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const hasFailed = finished && failed > 0;

  const parts: string[] = [];
  if (photos > 0) parts.push(plural(photos, 'foto', 'fotos'));
  if (videos > 0) parts.push(plural(videos, 'vídeo', 'vídeos'));
  const contents = parts.join(' e ');

  let title: string;
  let description: string;
  if (hasFailed) {
    title = 'Concluído com avisos';
    description = `${plural(failed, 'item não foi apagado', 'itens não foram apagados')} do servidor. Eles já saíram da lixeira deste aparelho.`;
  } else if (finished) {
    title = isAll ? 'Lixeira esvaziada' : 'Itens excluídos';
    description = contents ? `${contents} removidos definitivamente.` : 'Removidos definitivamente.';
  } else {
    title = isAll ? 'Esvaziando a lixeira' : 'Excluindo itens';
    description = `Removendo ${contents || plural(total, 'item', 'itens')} do servidor. Essa ação não pode ser desfeita.`;
  }

  const iconTone = hasFailed
    ? 'bg-amber-400/10 border-amber-400/25 text-amber-300'
    : finished
      ? 'bg-emerald-400/10 border-emerald-400/25 text-emerald-300'
      : 'bg-white/5 border-white/10 text-zinc-200';
  const barTone = hasFailed ? 'bg-amber-300' : finished ? 'bg-emerald-400' : 'bg-white';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4"
          >
            {/* Icon */}
            <div className={`relative mx-auto w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors duration-200 ${iconTone}`}>
              {hasFailed ? <AlertTriangle size={24} /> : finished ? <Check size={26} /> : <Trash2 size={24} />}
              {!finished && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center">
                  <Loader2 size={12} className="animate-spin text-zinc-300" />
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{title}</h3>
              <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">{description}</p>
            </div>

            {/* Progress Counter & Bar */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium px-0.5">
                <span>{finished ? 'Total' : 'Progresso'}</span>
                <span className="text-zinc-200">
                  {current} de {total} ({percentage}%)
                </span>
              </div>

              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ ease: 'easeOut', duration: 0.2 }}
                  className={`h-full rounded-full transition-colors duration-200 ${barTone}`}
                />
              </div>
            </div>

            {!finished && (
              <p className="text-[11px] text-zinc-500 font-normal">
                Mantenha o app aberto até terminar.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
