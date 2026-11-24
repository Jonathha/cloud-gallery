import { useState, useRef } from "react";
import { DecryptedImage } from "../../../../types";

export function useMediaLoaderState() {
  const [images, setImages] = useState<DecryptedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "local-only" | "loading">("loading");
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [backgroundSyncProgress, setBackgroundSyncProgress] = useState(0);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [cloudMediaCount, setCloudMediaCount] = useState(0);
  const [isMigrationNeeded, setIsMigrationNeeded] = useState(false);
  const [migrationItems, setMigrationItems] = useState<any[]>([]);

  const decryptedCache = useRef<Map<string, string>>(new Map());
  const pendingSyncRef = useRef<{ items: any[]; token: string } | null>(null);
  const migrationDismissedRef = useRef(false);
  const loadSequenceRef = useRef(0);

  return {
    images, setImages, loading, setLoading, syncStatus, setSyncStatus,
    backgroundSyncing, setBackgroundSyncing, backgroundSyncProgress, setBackgroundSyncProgress,
    showDownloadPrompt, setShowDownloadPrompt, cloudMediaCount, setCloudMediaCount,
    isMigrationNeeded, setIsMigrationNeeded, migrationItems, setMigrationItems,
    decryptedCache, pendingSyncRef, migrationDismissedRef, loadSequenceRef
  };
}
