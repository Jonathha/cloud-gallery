import React from 'react';
import { Check } from 'lucide-react';
import TrashIcon from '../../icons/TrashIcon';

interface GalleryItemOverlaysProps {
  isSelectionMode: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onDeleteClick: (e: React.MouseEvent) => void;
}

export const GalleryItemOverlays: React.FC<GalleryItemOverlaysProps> = ({
  isSelectionMode,
  isSelected,
  isHovered,
  onDeleteClick
}) => {
  return (
    <>
      {isSelectionMode && (
        <div className="absolute inset-0 z-10 flex items-start justify-start p-1.5 sm:p-2 pointer-events-none">
          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center shadow-md ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/70 bg-black/50'}`}>
            {isSelected && <Check size={13} strokeWidth={3} />}
          </div>
        </div>
      )}
      {!isSelectionMode && (
        <div className={`absolute top-1.5 right-1.5 transition-opacity duration-150 z-20 flex gap-1 ${isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <button
            onClick={onDeleteClick}
            className="p-1.5 bg-black/70 hover:bg-red-500/90 text-zinc-200 hover:text-white rounded-md transition-colors border border-white/10 cursor-pointer"
          >
            <TrashIcon size={13} />
          </button>
        </div>
      )}
    </>
  );
};
