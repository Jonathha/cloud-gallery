/**
 * Media processing utilities for secure vaults and chat.
 * Provides cutting-edge client-side compression, EXIF/metadata stripping, and size reduction.
 */

export { compressImage } from './media/compressImage';
export { compressVideo } from './media/compressVideo';
export { compressAudio, sliceFileIntoChunks, convertBlobToBase64 } from './media/utils';
export { generateImageThumbnail, generateVideoThumbnail } from './media/thumbnails';
