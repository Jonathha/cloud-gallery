import { useEffect, useState } from 'react';

export function useGlobalDragDrop(isUploaderOpen: boolean, setIsUploaderOpen: (v: boolean) => void) {
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isUploaderOpen) setIsDraggingGlobal(true); };
    const handleDragLeave = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.relatedTarget === null) setIsDraggingGlobal(false); };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setIsDraggingGlobal(false);
      if (e.dataTransfer?.files?.length) {
        setDroppedFiles(Array.from(e.dataTransfer.files));
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
  }, [isUploaderOpen, setIsUploaderOpen]);

  return { isDraggingGlobal, setIsDraggingGlobal, droppedFiles, setDroppedFiles };
}
