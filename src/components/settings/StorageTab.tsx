import React from 'react';
import { motion } from 'motion/react';
import { HardDrive, AlertTriangle, Download, Trash2 } from 'lucide-react';

interface DecryptedImage {
  id: string;
  url: string;
  failed?: boolean;
  createdAt: number;
}

interface StorageTabProps {
  cloudStorageUsed: number;
  storageUsage: { total: number; count: number };
  downloading: boolean;
  clearing: boolean;
  handleRemoveFailedImages: () => void;
  handleDownloadAll: () => void;
  handleClearCache: () => void;
  images: DecryptedImage[];
  formatBytes: (bytes: number) => string;
}

export default function StorageTab({
  cloudStorageUsed,
  storageUsage,
  downloading,
  clearing,
  handleRemoveFailedImages,
  handleDownloadAll,
  handleClearCache,
  images,
  formatBytes
}: StorageTabProps) {
  const failedCount = images.filter(i => i.failed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Gerenciamento de Armazenamento</h3>
        <p className="text-sm text-zinc-400 mb-6">
          Seus dados de imagens e vídeos são protegidos end-to-end com criptografia simétrica AES-GCM local e sincronizados com a nuvem.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
            <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Uso de Dados</p>
            <p className="text-2xl font-bold text-white tabular-nums">{formatBytes(storageUsage.total)}</p>
            <p className="text-[10px] text-zinc-600 mt-1">Estimativa de dados na nuvem</p>
          </div>
          <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
            <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Total de Fotos</p>
            <p className="text-2xl font-bold text-white tabular-nums">{storageUsage.count}</p>
            <p className="text-[10px] text-zinc-600 mt-1">Arquivos protegidos</p>
          </div>
        </div>

        <div className="p-5 bg-zinc-900/50 border border-white/10 rounded-2xl space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 text-white rounded-xl border border-white/5">
              <HardDrive size={24} />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium">Modo de Carregamento da Galeria</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Escolha como a galeria deve carregar as mídias da nuvem no seu dispositivo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('gallery_download_pref', 'thumbnails_only');
                sessionStorage.setItem('gallery_download_pref', 'thumbnails_only');
                window.dispatchEvent(new Event('storage'));
              }}
              className={`p-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                (localStorage.getItem('gallery_download_pref') || 'thumbnails_only') === 'thumbnails_only'
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700'
              }`}
            >
              Apenas Miniaturas
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('gallery_download_pref', 'full');
                sessionStorage.setItem('gallery_download_pref', 'full');
                window.dispatchEvent(new Event('storage'));
              }}
              className={`p-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                localStorage.getItem('gallery_download_pref') === 'full'
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700'
              }`}
            >
              Baixar Tudo na Memória
            </button>
          </div>
        </div>

        <div className="p-5 bg-zinc-900/50 border border-white/10 rounded-2xl space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 text-white rounded-xl border border-white/5">
              <HardDrive size={24} />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium">Cache Local e Backup</h4>
              <p className="text-sm text-zinc-500 mt-1">
                Libere espaço no seu dispositivo ou gerencie seus dados baixados.
              </p>
            </div>
          </div>

          <button
            onClick={handleRemoveFailedImages}
            disabled={clearing || failedCount === 0}
            className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {clearing ? 'Removendo...' : (
              <>
                <AlertTriangle size={18} />
                Remover Imagens Corrompidas ({failedCount})
              </>
            )}
          </button>
          
          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="w-full py-3 px-4 bg-white text-black hover:bg-zinc-200 font-medium rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading ? 'Baixando...' : (
              <>
                <Download size={18} />
                Baixar Imagens do Cache
              </>
            )}
          </button>
          
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {clearing ? 'Limpando...' : (
              <>
                <Trash2 size={18} />
                Limpar Cache Agora
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
