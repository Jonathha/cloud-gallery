import { getVideoObjectURL, getImageObjectURL } from "../../../utils/fileCrypto";
import { DecryptedImage } from "../../../types";

export async function handleInFlight(
  inFlight: Promise<void>, img: DecryptedImage, isVideo: boolean, isPreload: boolean,
  setSelectedImage: (url: string | null) => void, setSelectedImageId: (id: string | null) => void,
  setDownloadingFull: (v: boolean) => void, setFullDownloadProgress: (p: string) => void,
  showToast: (m: string, t?: "success" | "error") => void, getActiveId?: () => string | null
) {
  if (!isPreload) { setSelectedImage(img.url || null); setDownloadingFull(true); }
  try {
    await inFlight;
    const resolved = isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id);
    if (resolved) {
      img.originalUrl = resolved;
      if (!isPreload && (!getActiveId || getActiveId() === img.id)) setSelectedImage(resolved);
    } else {
      img.originalUrl = undefined;
    }
  } catch (err: any) {
    if (!isPreload && (!getActiveId || getActiveId() === img.id)) {
      if (img.url) setSelectedImage(img.url);
      else { showToast(err.message || "Erro ao carregar mídia.", "error"); setSelectedImage(null); setSelectedImageId(null); }
    }
  } finally {
    if (!isPreload && (!getActiveId || getActiveId() === img.id)) { setDownloadingFull(false); setFullDownloadProgress(""); }
  }
}
