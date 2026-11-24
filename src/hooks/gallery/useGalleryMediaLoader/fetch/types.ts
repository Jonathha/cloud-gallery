import React from "react";

export interface LoadImagesHelperParams {
  user: any;
  cryptoKey: any;
  decryptedCache: React.MutableRefObject<Map<string, string>>;
  setImages: any;
  setLoading: any;
  setSyncStatus: any;
  processAndSetImages: (imageList: any[], append?: boolean) => Promise<void>;
  migrationDismissedRef: React.MutableRefObject<boolean>;
  setIsMigrationNeeded: (val: boolean) => void;
  setMigrationItems: (val: any[]) => void;
  pendingSyncRef: React.MutableRefObject<{ items: any[]; token: string } | null>;
  setCloudMediaCount: (val: number) => void;
  setShowDownloadPrompt: (val: boolean) => void;
  executeBackgroundSync: (items: any[], token: string) => Promise<void>;
  isCurrent?: () => boolean;
}
