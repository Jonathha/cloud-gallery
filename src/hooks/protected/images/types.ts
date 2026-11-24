import { MutableRefObject } from 'react';

/**
 * Interface do item de mídia individual protegido no cofre
 */
export interface ProtectedImageItem {
  id: string;
  url?: string;
  originalUrl?: string;
  failed?: boolean;
  noThumbnail?: boolean;
  isVideo?: boolean;
  contentType?: string;
  fileSalt?: string;
  fileKeyCiphertext?: string;
  fileKeyIv?: string;
  thumbnailCiphertext?: string;
  thumbnailIv?: string;
  [key: string]: any;
}

/**
 * Retorno do hook de imagens protegidas
 */
export interface UseProtectedImagesReturn {
  images: ProtectedImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ProtectedImageItem[]>>;
  loading: boolean;
  error: string;
  downloadingFull: boolean;
  fullDownloadProgress: string;
  loadProtectedImages: () => Promise<void>;
  fetchFullResolution: (img: ProtectedImageItem) => Promise<void>;
  decryptedFullCache: MutableRefObject<Map<string, string>>;
}

export function isItemVideo(item: ProtectedImageItem): boolean {
  return Boolean(item.contentType && item.contentType.startsWith('video/'));
}
