export interface EncryptedImage {
  id: string;
  userId?: string;
  ciphertext?: string;
  iv?: string;
  createdAt: any;
  isChunked?: boolean;
  chunkCount?: number;
  contentType?: string;
  totalSize?: number;
  thumbnailCiphertext?: string;
  thumbnailIv?: string;
  fileKeyCiphertext?: string;
  fileKeyIv?: string;
  fileSalt?: string;
}

export interface DecryptedImage {
  id: string;
  userId?: string;
  url: string;
  originalUrl?: string;
  failed?: boolean;
  isMissing?: boolean;
  createdAt: number;
  isVideo?: boolean;
  contentType?: string;
  isChunked?: boolean;
  chunkCount?: number;
  totalSize?: number;
  noThumbnail?: boolean;
}
