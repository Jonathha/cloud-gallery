import React from "react";
import { getTimestamp } from "../../../utils/galleryHelpers";
import { DecryptedImage } from "../../../types";
import { calculateViewportItemsCount } from "./process/viewportCalc";
import { splitCachedAndCold } from "./process/cachedMediaSplit";
import { processPriorityItems } from "./process/priorityDecryption";
import { scheduleBackgroundBatch } from "./process/backgroundBatch";

export async function processAndSetImagesHelper(
  imageList: any[], append: boolean, securityImageId: string | null,
  isExtraUnlocked: boolean | undefined, extraPassword: string | null,
  cryptoKey: any, decryptedCache: Map<string, string>,
  setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>, setLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  if (imageList.length === 0) { if (!append) { setImages([]); } return; }
  const list = [...imageList].sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
  const { cachedItems, coldItems } = splitCachedAndCold(list, securityImageId, isExtraUnlocked, decryptedCache);

  if (cachedItems.length > 0) {
    setImages((prev) => {
      const map = new Map((append ? prev : []).map((p) => [p.id, p]));
      for (const res of cachedItems) map.set(res.id, res);
      return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
    });
    setLoading(false);
  }
  if (coldItems.length === 0) { setLoading(false); return; }

  const viewportSize = calculateViewportItemsCount();
  const priority = coldItems.slice(0, viewportSize);
  const background = coldItems.slice(viewportSize);

  if (cachedItems.length > 0) {
    processPriorityItems(priority, cachedItems, append, securityImageId, isExtraUnlocked, extraPassword, cryptoKey, decryptedCache, setImages, setLoading).catch(() => {});
  } else {
    await processPriorityItems(priority, cachedItems, append, securityImageId, isExtraUnlocked, extraPassword, cryptoKey, decryptedCache, setImages, setLoading);
  }

  if (background.length > 0) {
    scheduleBackgroundBatch(background, securityImageId, isExtraUnlocked, extraPassword, cryptoKey, decryptedCache, setImages);
  }
}
