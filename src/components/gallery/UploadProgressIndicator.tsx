import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

export const UPLOAD_PROGRESS_EVENT = "upload-progress";

export interface UploadProgressDetail {
  active: boolean;
  text?: string;
  current?: number;
  total?: number;
  /** Quem emitiu: um "fim" só vale se vier da mesma origem do último "início". */
  source?: string;
}

/** Avisa o indicador do topo da tela (usado pelo envio de fotos/vídeos da galeria). */
export function emitUploadProgress(detail: UploadProgressDetail) {
  window.dispatchEvent(new CustomEvent(UPLOAD_PROGRESS_EVENT, { detail }));
}

// "Compactando vídeo (2/5): 40%" -> "Compactando vídeo: 40%" (a contagem aparece separada)
function cleanStep(text: string): string {
  return text.replace(/\s*\(\d+\/\d+\)/, "").replace(/\.{3}$/, "…");
}

/**
 * Indicador mini no topo da tela enquanto fotos/vídeos são enviados em segundo plano.
 * Não bloqueia toque (pointer-events-none) e some sozinho quando o envio termina.
 */
export default function UploadProgressIndicator() {
  const [state, setState] = useState<UploadProgressDetail>({ active: false });

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<UploadProgressDetail>).detail;
      setState((prev) => (!d.active && prev.source !== d.source ? prev : d));
    };
    window.addEventListener(UPLOAD_PROGRESS_EVENT, handler);
    return () => window.removeEventListener(UPLOAD_PROGRESS_EVENT, handler);
  }, []);

  const step = cleanStep(state.text || "Enviando…");
  const total = state.total || 0;
  const current = Math.min(state.current || (total > 1 ? 1 : 0), total || Infinity);
  const showCount = total > 1;
  const percentage = total > 1 ? Math.min(100, Math.round((current / total) * 100)) : null;
  const count = showCount ? `${current}/${total}` : "";

  return (
    <AnimatePresence>
      {state.active && (
        <motion.div
          key="upload-progress-indicator"
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 -translate-x-1/2 z-[190] pointer-events-none top-[calc(env(safe-area-inset-top,0px)+0.5rem)] ${showCount ? "w-max max-w-[min(calc(100%-2rem),22rem)]" : "w-max max-w-[calc(100%-2rem)]"}`}
        >
          <div className="flex flex-col gap-1.5 px-3.5 py-2 rounded-2xl bg-zinc-900/95 border border-white/10 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-zinc-200">
            <div className="flex items-center gap-2 min-w-0">
              <Loader2 size={14} className="animate-spin shrink-0 text-zinc-400" />
              <motion.span
                key={`${step}-${count}`}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="text-xs font-medium tracking-tight truncate min-w-0"
              >
                {step}
              </motion.span>
              {count && (
                <span className="ml-auto text-xs text-zinc-500 tabular-nums shrink-0">{count}</span>
              )}
              {percentage !== null && (
                <span className="text-xs text-zinc-500 tabular-nums shrink-0 w-9 text-right">
                  {percentage}%
                </span>
              )}
            </div>

            {percentage !== null && (
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
                className="h-1 w-full rounded-full bg-white/10 overflow-hidden"
              >
                <motion.div
                  initial={false}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="h-full rounded-full bg-zinc-100"
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
