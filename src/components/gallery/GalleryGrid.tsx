import React from "react";
import GalleryEmptyState from "../GalleryEmptyState";
import GalleryItem from "../GalleryItem";
import { DecryptedImage } from "../../types";

interface GalleryGridProps {
  loading: boolean;
  images: DecryptedImage[];
  isSelectionMode: boolean;
  setIsSelectionMode?: (mode: boolean) => void;
  selectedForDeletion: string[];
  setSelectedForDeletion?: (val: string[] | ((prev: string[]) => string[])) => void;
  securityImageId: string | null;
  isExtraUnlocked: boolean;
  extraPassword: string | null;
  handleImageClick: (img: DecryptedImage, index: number, e: React.MouseEvent) => void;
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean, priority?: number) => Promise<void>;
  setImageToDelete: (id: string | null) => void;
  setImageToProtect: (id: string | null) => void;
  setIsUploaderOpen: (open: boolean) => void;
}

function GalleryGrid({
  loading,
  images,
  isSelectionMode,
  setIsSelectionMode,
  selectedForDeletion,
  setSelectedForDeletion,
  securityImageId,
  isExtraUnlocked,
  extraPassword,
  handleImageClick,
  fetchFullMedia,
  setImageToDelete,
  setImageToProtect,
  setIsUploaderOpen,
}: GalleryGridProps) {
  if (loading && images.length === 0) {
    return (
      <main className="max-w-7xl mx-auto p-2 sm:p-4 lg:p-6 pb-28 sm:pb-32 w-full flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex flex-wrap gap-1.5 sm:gap-2 lg:gap-3 after:content-[''] after:flex-[10]">
          {[...Array(21)].map((_, i) => (
            <div
              key={i}
              className="h-32 sm:h-40 lg:h-48 bg-zinc-900/80 border border-white/[0.04] animate-pulse rounded-md sm:rounded-lg"
              style={{ flexGrow: 1, width: "150px" }}
            />
          ))}
        </div>
      </main>
    );
  }

  if (images.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 w-full flex-1 overflow-hidden flex flex-col items-center justify-center">
        <GalleryEmptyState setIsUploaderOpen={setIsUploaderOpen} />
      </main>
    );
  }

  return (
    <main
      className="max-w-7xl mx-auto p-2 sm:p-4 lg:p-6 pb-28 sm:pb-32 w-full flex-1 overflow-y-auto scrollbar-thin"
      style={{ overflowAnchor: "none" }}
    >
      <div className="flex flex-wrap gap-1 sm:gap-1.5 lg:gap-2 [--gallery-row-h:118px] sm:[--gallery-row-h:152px] lg:[--gallery-row-h:188px] after:content-[''] after:grow-[99999] after:basis-0">
        {images.map((img, index) => (
          <GalleryItem
            key={img.id}
            img={img}
            index={index}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            selectedForDeletion={selectedForDeletion}
            setSelectedForDeletion={setSelectedForDeletion}
            securityImageId={securityImageId}
            isExtraUnlocked={isExtraUnlocked}
            extraPassword={extraPassword}
            handleImageClick={handleImageClick}
            fetchFullMedia={fetchFullMedia}
            setImageToDelete={setImageToDelete}
            setImageToProtect={setImageToProtect}
          />
        ))}
      </div>
    </main>
  );
}

export default React.memo(GalleryGrid);

