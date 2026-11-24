import React from 'react';
import { Database, AlertTriangle, Download, Loader2 } from 'lucide-react';
import TrashIcon from '../../icons/TrashIcon';

interface CacheManagementCardProps {
  failedCount: number;
  clearing: boolean;
  downloading: boolean;
  handleRemoveFailedImages: () => void;
  handleDownloadAll: () => void;
  handleClearCache: () => void;
}

export default function CacheManagementCard({
  failedCount,
  clearing,
  downloading,
  handleRemoveFailedImages,
  handleDownloadAll,
  handleClearCache,
}: CacheManagementCardProps) {
  return (
    <div className="p-4 sm:p-5 bg-zinc-900/60 border border-white/[0.08] rounded-2xl space-y-4">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
          <Database size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold text-sm sm:text-base">
            Cache Local e Backup
          </h4>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Libere espaço temporário no seu dispositivo ou gerencie seus dados baixados.
          </p>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        {failedCount > 0 && (
          <button
            type="button"
            onClick={handleRemoveFailedImages}
            disabled={clearing}
            className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 active:scale-[0.98] text-red-400 border border-red-500/20 text-xs font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {clearing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <AlertTriangle size={14} />
            )}
            Remover Imagens Corrompidas ({failedCount})
          </button>
        )}

        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={downloading}
          className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-950 text-xs font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 size={14} className="animate-spin text-zinc-950" />
          ) : (
            <Download size={14} />
          )}
          {downloading ? 'Baixando...' : 'Baixar Imagens do Cache'}
        </button>

        <button
          type="button"
          onClick={handleClearCache}
          disabled={clearing}
          className="w-full py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 hover:text-white border border-white/[0.06] text-xs font-medium rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {clearing ? (
            <Loader2 size={14} className="animate-spin text-zinc-300" />
          ) : (
            <TrashIcon size={14} />
          )}
          {clearing ? 'Limpando...' : 'Limpar Cache Agora'}
        </button>
      </div>
    </div>
  );
}
