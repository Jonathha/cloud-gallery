import React from 'react';
import { HardDrive, Trash2 } from 'lucide-react';

interface AboutTabNativeProps {
  isApkInCache: boolean;
  apkSize: string | null;
  isDeleting: boolean;
  handleInstallFromCache: () => void;
  handleDeleteFromCache: () => void;
}

export default function AboutTabNative({
  isApkInCache,
  apkSize,
  isDeleting,
  handleInstallFromCache,
  handleDeleteFromCache,
}: AboutTabNativeProps) {
  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl text-white">
          <HardDrive size={20} />
        </div>
        <h3 className="text-lg font-semibold text-white">Armazenamento do App</h3>
      </div>

      <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-3xl space-y-5">
        <div>
          <p className="text-sm font-semibold text-white">Cache de Atualizações (APK)</p>
          <p className="text-xs text-zinc-400 mt-1">
            Gerencie arquivos de instalação baixados diretamente na memória privada do aplicativo para evitar downloads duplicados e economizar seus dados.
          </p>
        </div>

        <div className="p-4 bg-zinc-950/80 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isApkInCache ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
            <div className="text-left">
              <p className="text-xs font-semibold text-white">
                {isApkInCache ? 'Instalador APK Salvo' : 'Nenhum arquivo APK em cache'}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {isApkInCache 
                  ? `Tamanho: ${apkSize || 'Aprox. 60 MB'} • Pronto para instalação rápida` 
                  : 'O arquivo será guardado na memória quando você baixar uma atualização.'}
              </p>
            </div>
          </div>

          {isApkInCache && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handleInstallFromCache}
                className="px-3.5 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer"
              >
                Instalar
              </button>
              <button
                onClick={handleDeleteFromCache}
                disabled={isDeleting}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer"
                title="Excluir arquivo de atualização"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
