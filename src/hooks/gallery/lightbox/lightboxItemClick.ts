import { DecryptedImage } from "../../../types";
import { getVideoObjectURL, getImageObjectURL } from "../../../utils/fileCrypto";

export async function handleItemClickHelper(
  img: DecryptedImage, index: number, e: React.MouseEvent, props: any
) {
  if (props.isSelectionMode) { props.handleSelectionClick(img, index, e); return; }
  if (img.isMissing || img.failed) return;
  if (img.id === props.securityImageId && !props.isExtraUnlocked && props.extraPassword) {
    props.setIsPromptingExtra(img.id); return;
  }
  const isVideo = img.isVideo || img.contentType?.startsWith("video/") || false;
  props.setSelectedImageIsVideo(isVideo);
  if (!props.selectedImageId) props.setShowControls(true);
  const url = new URL(window.location.href);
  url.searchParams.set("image", img.id);
  if (!props.selectedImageId) {
    window.history.pushState({ isLightbox: true, imageId: img.id }, "", url);
  } else {
    window.history.replaceState({ isLightbox: true, imageId: img.id }, "", url);
  }

  const cachedObjectURL = isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id);
  if (!cachedObjectURL) img.originalUrl = undefined;
  props.setSelectedImage(cachedObjectURL || img.originalUrl || img.url || null);
  props.setSelectedImageId(img.id);
  await props.fetchFullMedia(img);
}
