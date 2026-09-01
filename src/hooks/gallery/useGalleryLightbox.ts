import { UseGalleryLightboxProps } from "./types";
import { useGalleryPreload } from "./useGalleryPreload";
import { useGalleryLightboxNavigation } from "./useGalleryLightboxNavigation";
import { useGalleryLightboxState } from "./useGalleryLightboxState";
import { useGalleryLightboxHandlers } from "./useGalleryLightboxHandlers";

export function useGalleryLightbox(props: UseGalleryLightboxProps) {
  const state = useGalleryLightboxState(props);

  const handlers = useGalleryLightboxHandlers({
    ...props,
    setShowControls: state.setShowControls,
    setIsZoomed: state.setIsZoomed,
    setIsPromptingExtra: state.setIsPromptingExtra,
  });

  const navigation = useGalleryLightboxNavigation({
    images: props.images,
    selectedImageId: props.selectedImageId,
    setIsZoomed: state.setIsZoomed,
    handleImageClick: handlers.handleImageClick,
  });

  useGalleryPreload({
    images: props.images,
    selectedImageId: props.selectedImageId,
    fetchFullMedia: props.fetchFullMedia,
  });

  return {
    ...state,
    ...handlers,
    ...navigation,
    isExtraUnlocked: props.isExtraUnlocked,
    setIsExtraUnlocked: props.setIsExtraUnlocked,
  };
}
