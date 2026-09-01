import { useEffect, useState } from 'react';
import { DecryptedImage } from '../../types';

interface KeyboardProps {
  images: DecryptedImage[];
  selectedImage: string | null;
  selectedImageId: string | null;
  isUploaderOpen: boolean;
  isSettingsOpen: boolean;
  isSelectionMode: boolean;
  selectedForDeletion: string[];
  setIsSelectionMode: (val: boolean) => void;
  setSelectedForDeletion: (ids: string[]) => void;
  setIsDeletingMultiple: (val: boolean) => void;
  handleNextImage: () => void;
  handlePrevImage: () => void;
  closeLightbox: () => void;
  setIsUploaderOpen: (val: boolean) => void;
}

export function useGalleryKeyboard({
  images,
  selectedImage,
  selectedImageId,
  isUploaderOpen,
  isSettingsOpen,
  isSelectionMode,
  selectedForDeletion,
  setIsSelectionMode,
  setSelectedForDeletion,
  setIsDeletingMultiple,
  handleNextImage,
  handlePrevImage,
  closeLightbox,
  setIsUploaderOpen,
}: KeyboardProps) {
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUploaderOpen) setIsDraggingGlobal(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.relatedTarget === null) {
        setIsDraggingGlobal(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingGlobal(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        setDroppedFiles(files);
        setIsUploaderOpen(true);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isUploaderOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey && e.key === 'a' && !selectedImage && !isUploaderOpen && !isSettingsOpen) {
        e.preventDefault();
        setIsSelectionMode(true);
        setSelectedForDeletion(images.map(img => img.id));
      }

      if (e.key === 'Delete' && isSelectionMode && selectedForDeletion.length > 0) {
        setIsDeletingMultiple(true);
      }

      if (!selectedImage) {
        if (e.key.toLowerCase() === 'f' && images.length > 0 && !isUploaderOpen && !isSettingsOpen) {
          e.preventDefault();
          const firstImg = images[0];
          const url = new URL(window.location.href);
          url.searchParams.set('image', firstImg.id);
          window.history.replaceState({}, '', url);
        }
        return;
      }
      
      if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(console.error);
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(console.error);
          }
        }
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedImage,
    selectedImageId,
    images,
    isSelectionMode,
    selectedForDeletion,
    isUploaderOpen,
    isSettingsOpen,
    handleNextImage,
    handlePrevImage,
    closeLightbox,
  ]);

  return {
    isDraggingGlobal,
    setIsDraggingGlobal,
    droppedFiles,
    setDroppedFiles,
  };
}
