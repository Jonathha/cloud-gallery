import { DecryptedImage } from "../../../types";

export interface UseGalleryMediaFetcherProps {
  isExtraUnlocked?: boolean;
  setSelectedImage: (url: string | null) => void;
  setSelectedImageId: (id: string | null) => void;
  setDownloadingFull: (val: boolean) => void;
  setFullDownloadProgress: (progress: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  getActiveId?: () => string | null;
}

export interface PerformFetchParams {
  img: DecryptedImage;
  isVideo: boolean;
  isPreload: boolean;
  cryptoKey: CryptoKey | null;
  securityImageId?: string | null;
  isExtraUnlocked?: boolean;
  extraPassword?: string | null;
  user: any;
  setSelectedImage: (url: string | null) => void;
  setDownloadingFull: (val: boolean) => void;
  setFullDownloadProgress: (progress: string) => void;
  getActiveId?: () => string | null;
}
