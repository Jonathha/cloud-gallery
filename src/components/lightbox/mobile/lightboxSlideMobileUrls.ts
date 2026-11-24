import { DecryptedImage } from '../../../types';
import { getImageObjectURL } from '../../../utils/fileCrypto';

export function resolveLightboxMobileUrls(
  img: DecryptedImage,
  isCurrent: boolean,
  selectedImage: string | null
) {
  const isVideo = img.isVideo || img.contentType?.startsWith('video/') || false;
  const thumbnailUrl = img.url || '';

  const cachedOriginal = getImageObjectURL(img.id);
  const activeOriginalUrl =
    cachedOriginal ||
    (selectedImage &&
    (selectedImage.startsWith('blob:') || selectedImage.startsWith('data:image/')) &&
    selectedImage !== img.url
      ? selectedImage
      : null) ||
    (img.originalUrl &&
    (img.originalUrl.startsWith('blob:') || img.originalUrl.startsWith('data:image/')) &&
    img.originalUrl !== img.url
      ? img.originalUrl
      : null);

  const validVideoSrc =
    isVideo && isCurrent
      ? selectedImage &&
        (selectedImage.startsWith('blob:') || selectedImage.startsWith('data:video/'))
        ? selectedImage
        : img.originalUrl &&
          (img.originalUrl.startsWith('blob:') || img.originalUrl.startsWith('data:video/'))
        ? img.originalUrl
        : img.url && (img.url.startsWith('blob:') || img.url.startsWith('data:video/'))
        ? img.url
        : undefined
      : undefined;

  return { isVideo, thumbnailUrl, activeOriginalUrl, validVideoSrc };
}
