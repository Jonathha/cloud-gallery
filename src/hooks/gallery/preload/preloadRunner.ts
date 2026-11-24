import { DecryptedImage } from "../../../types";

export function executePreload(
  immediate: DecryptedImage[], secondary: DecryptedImage[],
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean) => Promise<void>
) {
  let active = true;
  let timer: any = null;
  (async () => {
    for (const img of immediate) {
      if (!active) break;
      try { await fetchFullMedia(img, true); } catch {}
    }
    if (active && secondary.length > 0) {
      timer = setTimeout(async () => {
        for (const img of secondary) {
          if (!active) break;
          try { await fetchFullMedia(img, true); } catch {}
        }
      }, 150);
    }
  })();
  return () => { active = false; if (timer) clearTimeout(timer); };
}
