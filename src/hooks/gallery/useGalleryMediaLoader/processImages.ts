import React from "react";
import { decryptSingleThumbnail, sessionDecryptedCache } from "../galleryDecryptHelper";
import { getTimestamp } from "../../../utils/galleryHelpers";
import { DecryptedImage } from "../../../types";

function calculateViewportItemsCount(): number {
  if (typeof window === "undefined") return 32;

  const width = window.innerWidth;
  const height = window.innerHeight;

  let cols = 4;
  if (width >= 1280) cols = 10;
  else if (width >= 1024) cols = 8;
  else if (width >= 768) cols = 6;
  else if (width >= 640) cols = 5;

  const gridWidth = Math.min(width, 1280);
  const itemSize = gridWidth / cols;

  const verticalOffset = width < 768 ? 100 : 200;
  const visibleHeight = Math.max(height - verticalOffset, 300);
  const rows = Math.ceil(visibleHeight / itemSize);

  const totalRows = rows + 2; // Buffer rows for smooth scrolling

  return Math.max(totalRows * cols, 24);
}

export async function processAndSetImagesHelper(
  imageList: any[],
  append: boolean,
  securityImageId: string | null,
  isExtraUnlocked: boolean | undefined,
  extraPassword: string | null,
  cryptoKey: any,
  decryptedCache: Map<string, string>,
  setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  if (imageList.length === 0) {
    if (!append) {
      setImages([]);
      setLoading(false);
    }
    return;
  }

  const listToProcess = [...imageList];
  listToProcess.sort((a, b) => {
    const timeA = getTimestamp(a.createdAt);
    const timeB = getTimestamp(b.createdAt);
    return timeB - timeA;
  });

  // 1. Separate the list into what's already in RAM (Cached) and what's not (Cold)
  const cachedItems: DecryptedImage[] = [];
  const coldItems: any[] = [];

  for (const img of listToProcess) {
    const isSecurityImg = img.id === securityImageId;
    const isCached = sessionDecryptedCache.has(img.id) || (decryptedCache && decryptedCache.has(img.id));

    if (isCached || (isSecurityImg && !isExtraUnlocked)) {
      const cachedUrl = sessionDecryptedCache.get(img.id) || (decryptedCache && decryptedCache.get(img.id)) || "";
      cachedItems.push({
        id: img.id,
        url: cachedUrl,
        createdAt: getTimestamp(img.createdAt),
        isVideo: img.contentType?.startsWith('video/') || false,
        isChunked: img.isChunked || false,
        chunkCount: img.chunkCount || 1,
        contentType: img.contentType || (img.contentType?.startsWith('video/') ? 'video/mp4' : 'image/png'),
        totalSize: img.totalSize || 0,
        failed: false,
        noThumbnail: false
      } as DecryptedImage);
    } else {
      coldItems.push(img);
    }
  }

  // 2. Render all cached/RAM items synchronously to provide instant visual feedback
  if (cachedItems.length > 0) {
    setImages((prev) => {
      const baseList = append ? prev : [];
      const prevMap = new Map(baseList.map((p) => [p.id, p]));
      for (const res of cachedItems) {
        prevMap.set(res.id, res);
      }
      const final = Array.from(prevMap.values());
      final.sort((a, b) => b.createdAt - a.createdAt);
      return final;
    });
    setLoading(false);
  }

  if (coldItems.length === 0) {
    // Everything was in RAM, we can exit immediately!
    setLoading(false);
    return;
  }

  // 3. For cold items, separate them based on estimated viewport visibility
  const viewportSize = calculateViewportItemsCount();
  const priorityColdItems: any[] = [];
  const backgroundColdItems: any[] = [];

  for (let idx = 0; idx < listToProcess.length; idx++) {
    const img = listToProcess[idx];
    const isCached = sessionDecryptedCache.has(img.id) || (decryptedCache && decryptedCache.has(img.id));
    const isSecurityImg = img.id === securityImageId;

    if (!isCached && !(isSecurityImg && !isExtraUnlocked)) {
      if (idx < viewportSize) {
        priorityColdItems.push(img);
      } else {
        backgroundColdItems.push(img);
      }
    }
  }

  // 4. Process visible priority cold items first
  if (priorityColdItems.length > 0) {
    const decryptedPriority = await Promise.all(
      priorityColdItems.map((img) =>
        decryptSingleThumbnail(
          img,
          securityImageId,
          isExtraUnlocked,
          extraPassword,
          cryptoKey,
          decryptedCache
        )
      )
    );

    setImages((prev) => {
      const baseList = (cachedItems.length === 0 && !append) ? [] : prev;
      const prevMap = new Map(baseList.map((p) => [p.id, p]));
      for (const res of decryptedPriority) {
        prevMap.set(res.id, res);
      }
      const final = Array.from(prevMap.values());
      final.sort((a, b) => b.createdAt - a.createdAt);
      return final;
    });

    setLoading(false);
  } else if (cachedItems.length === 0) {
    setLoading(false);
  }

  // 5. Process background cold items progressively in small non-blocking chunks
  if (backgroundColdItems.length > 0) {
    const bgBatchSize = 15;
    let index = 0;

    const processNextBgBatch = async () => {
      if (!cryptoKey) return; // Vault locked during background processing, abort!
      if (index >= backgroundColdItems.length) return;

      const batch = backgroundColdItems.slice(index, index + bgBatchSize);
      index += bgBatchSize;

      const decryptedBatch = await Promise.all(
        batch.map((img) =>
          decryptSingleThumbnail(
            img,
            securityImageId,
            isExtraUnlocked,
            extraPassword,
            cryptoKey,
            decryptedCache
          )
        )
      );

      setImages((prev) => {
        const prevMap = new Map(prev.map((p) => [p.id, p]));
        for (const res of decryptedBatch) {
          prevMap.set(res.id, res);
        }
        const final = Array.from(prevMap.values());
        final.sort((a, b) => b.createdAt - a.createdAt);
        return final;
      });

      if (index < backgroundColdItems.length) {
        setTimeout(processNextBgBatch, 40);
      }
    };

    // Schedule background processing after priority batch settles to keep main thread highly responsive
    setTimeout(processNextBgBatch, 100);
  }
}
