import { DecryptedImage } from "../../types";

export interface UseGalleryLightboxProps {
  images: DecryptedImage[];
  selectedImage: string | null;
  selectedImageId: string | null;
  setSelectedImage: (img: string | null) => void;
  setSelectedImageId: (id: string | null) => void;
  setSelectedImageIsVideo: (isVideo: boolean) => void;
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean) => Promise<void>;
  securityImageId: string | null;
  extraPassword: string | null;
  resetFailedAttempts: () => Promise<void>;
  registerFailedAttempt: () => Promise<{ lockedUntil: number | string | null; failedAttempts?: number }>;
  lockVault: () => void;
  isSelectionMode: boolean;
  handleSelectionClick: (img: DecryptedImage, index: number, e: React.MouseEvent) => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  isExtraUnlocked: boolean;
  setIsExtraUnlocked: (val: boolean) => void;
}
