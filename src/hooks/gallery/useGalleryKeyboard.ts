import { DecryptedImage } from '../../types';
import { useGlobalDragDrop } from './keyboard/useGlobalDragDrop';
import { useGalleryShortcuts } from './keyboard/useGalleryShortcuts';

interface KeyboardProps {
  images: DecryptedImage[]; selectedImage: string | null; selectedImageId: string | null;
  isUploaderOpen: boolean; isSettingsOpen: boolean; isSelectionMode: boolean;
  selectedForDeletion: string[]; setIsSelectionMode: (val: boolean) => void;
  setSelectedForDeletion: (ids: string[]) => void; setIsDeletingMultiple: (val: boolean) => void;
  handleNextImage: () => void; handlePrevImage: () => void; closeLightbox: () => void;
  setIsUploaderOpen: (val: boolean) => void;
}

export function useGalleryKeyboard(props: KeyboardProps) {
  const { isDraggingGlobal, setIsDraggingGlobal, droppedFiles, setDroppedFiles } = useGlobalDragDrop(props.isUploaderOpen, props.setIsUploaderOpen);
  useGalleryShortcuts(props);
  return { isDraggingGlobal, setIsDraggingGlobal, droppedFiles, setDroppedFiles };
}
