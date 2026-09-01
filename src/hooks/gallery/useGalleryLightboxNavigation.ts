import { DecryptedImage } from "../../types";

interface UseGalleryLightboxNavigationProps {
  images: DecryptedImage[];
  selectedImageId: string | null;
  setIsZoomed: (z: boolean) => void;
  handleImageClick: (img: DecryptedImage, index: number, e: React.MouseEvent) => void;
}

export function useGalleryLightboxNavigation({
  images,
  selectedImageId,
  setIsZoomed,
  handleImageClick,
}: UseGalleryLightboxNavigationProps) {
  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedImageId) return;

    const currentIndex = images.findIndex((img) => img.id === selectedImageId);
    if (currentIndex < images.length - 1) {
      const nextImg = images[currentIndex + 1];
      setIsZoomed(false);
      handleImageClick(nextImg, currentIndex + 1, e || ({} as any));
    }
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedImageId) return;

    const currentIndex = images.findIndex((img) => img.id === selectedImageId);
    if (currentIndex > 0) {
      const prevImg = images[currentIndex - 1];
      setIsZoomed(false);
      handleImageClick(prevImg, currentIndex - 1, e || ({} as any));
    }
  };

  return {
    handleNextImage,
    handlePrevImage,
  };
}
