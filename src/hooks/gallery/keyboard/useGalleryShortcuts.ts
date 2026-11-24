import { useEffect } from 'react';
import { DecryptedImage } from '../../../types';

export function useGalleryShortcuts(props: {
  images: DecryptedImage[]; selectedImage: string | null; isUploaderOpen: boolean; isSettingsOpen: boolean;
  isSelectionMode: boolean; selectedForDeletion: string[]; setIsSelectionMode: (v: boolean) => void;
  setSelectedForDeletion: (ids: string[]) => void; setIsDeletingMultiple: (v: boolean) => void;
  handleNextImage: () => void; handlePrevImage: () => void; closeLightbox: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey && e.key === 'a' && !props.selectedImage && !props.isUploaderOpen && !props.isSettingsOpen) {
        e.preventDefault(); props.setIsSelectionMode(true); props.setSelectedForDeletion(props.images.map(i => i.id));
      }
      if (e.key === 'Delete' && props.isSelectionMode && props.selectedForDeletion.length > 0) props.setIsDeletingMultiple(true);
      if (!props.selectedImage) {
        if (e.key.toLowerCase() === 'f' && props.images.length > 0 && !props.isUploaderOpen && !props.isSettingsOpen) {
          e.preventDefault(); const url = new URL(window.location.href); url.searchParams.set('image', props.images[0].id); window.history.replaceState({}, '', url);
        }
        return;
      }
      if (e.key === 'ArrowRight') props.handleNextImage();
      else if (e.key === 'ArrowLeft') props.handlePrevImage();
      else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      } else if (e.key === 'Escape') props.closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props]);
}
