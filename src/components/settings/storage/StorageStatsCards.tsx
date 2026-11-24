import React from 'react';
import { HardDrive, Images } from 'lucide-react';

interface StorageStatsCardsProps {
  storageUsage: { total: number; count: number };
  formatBytes: (bytes: number) => string;
}

export default function StorageStatsCards({ storageUsage, formatBytes }: StorageStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
      <div className="p-4 bg-zinc-900/60 border border-white/[0.08] rounded-2xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
            Uso de Dados
          </span>
          <div className="p-1.5 rounded-lg bg-white/5 text-zinc-400">
            <HardDrive size={14} />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">
            {formatBytes(storageUsage.total)}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Estimativa na nuvem</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900/60 border border-white/[0.08] rounded-2xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
            Total de Fotos
          </span>
          <div className="p-1.5 rounded-lg bg-white/5 text-zinc-400">
            <Images size={14} />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">
            {storageUsage.count}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Arquivos protegidos</p>
        </div>
      </div>
    </div>
  );
}
