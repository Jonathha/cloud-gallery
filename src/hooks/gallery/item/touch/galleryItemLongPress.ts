import { UseGalleryItemTouchProps } from "./galleryItemTouchTypes";

export function createTriggerLongPressSelection(
  props: Pick<UseGalleryItemTouchProps, "imgId" | "setIsSelectionMode" | "setSelectedForDeletion">
) {
  const { imgId, setIsSelectionMode, setSelectedForDeletion } = props;

  return () => {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (_) {}
    }
    if (setIsSelectionMode) {
      setIsSelectionMode(true);
    }
    if (setSelectedForDeletion) {
      setSelectedForDeletion((prev: string[]) => {
        if (prev.includes(imgId)) return prev;
        return [...prev, imgId];
      });
    }
  };
}
