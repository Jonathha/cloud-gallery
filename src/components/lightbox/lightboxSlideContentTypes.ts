import { DecryptedImage } from '../../types';

export interface LightboxSlideContentProps {
  img: DecryptedImage;
  isCurrent: boolean;
  selectedImage: string | null;
  downloadingFull: boolean;
  imageFit: 'contain' | 'cover';
  setImageFit?: (fit: 'contain' | 'cover') => void;
  isZoomed: boolean;
  setIsZoomed: (zoomed: boolean) => void;
  showControls: boolean;
  setShowControls: (show: boolean | ((prev: boolean) => boolean)) => void;
  onClose: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
  setIsShareOpen?: (open: boolean) => void;
  setIsPlaybackActive?: (active: boolean) => void;
}
