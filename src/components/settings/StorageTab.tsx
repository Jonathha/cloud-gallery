import React from 'react';
import { motion } from 'motion/react';
import StorageStatsCards from './storage/StorageStatsCards';
import GalleryLoadingModeCard from './storage/GalleryLoadingModeCard';
import CacheManagementCard from './storage/CacheManagementCard';

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
  storageUsage,
  downloading,
  clearing,
  handleRemoveFailedImages,
  handleDownloadAll,
  handleClearCache,
  images,
  formatBytes,
}: StorageTabProps) {
  const failedCount = images.filter((i) => i.failed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 text-left pb-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          Armazenamento & Dados
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400">
          Suas mídias são protegidas com criptografia AES-GCM e sincronizadas na nuvem.
        </p>
      </div>

      <StorageStatsCards storageUsage={storageUsage} formatBytes={formatBytes} />

      <div className="space-y-4">
        <GalleryLoadingModeCard />

        <CacheManagementCard
          failedCount={failedCount}
          clearing={clearing}
          downloading={downloading}
          handleRemoveFailedImages={handleRemoveFailedImages}
          handleDownloadAll={handleDownloadAll}
          handleClearCache={handleClearCache}
        />
      </div>
    </motion.div>
  );
}
