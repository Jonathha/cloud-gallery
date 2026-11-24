import React from "react";
import { decryptSingleThumbnail } from "../../galleryDecryptHelper";
import { DecryptedImage } from "../../../../types";

export function scheduleBackgroundBatch(
  backgroundColdItems: any[], securityImageId: string | null, isExtraUnlocked: boolean | undefined,
  extraPassword: string | null, cryptoKey: any, decryptedCache: Map<string, string>,
  setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>
) {
  let index = 0;
  const batchSize = 15;
  const processNext = async () => {
    if (!cryptoKey || index >= backgroundColdItems.length) return;
    const batch = backgroundColdItems.slice(index, index + batchSize);
    index += batchSize;
    const decrypted = await Promise.all(
      batch.map((img) => decryptSingleThumbnail(img, securityImageId, isExtraUnlocked, extraPassword, cryptoKey, decryptedCache))
    );
    setImages((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      for (const res of decrypted) {
        const ex = map.get(res.id);
        if (ex?.url && !res.url && (res.failed || res.isMissing)) continue; // falha antiga não apaga foto já carregada
        map.set(res.id, res);
      }
      const final = Array.from(map.values());
      final.sort((a, b) => b.createdAt - a.createdAt);
      return final;
    });
    if (index < backgroundColdItems.length) setTimeout(processNext, 40);
  };
  setTimeout(processNext, 100);
}
