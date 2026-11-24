import React from "react";
import { decryptSingleThumbnail } from "../../galleryDecryptHelper";
import { DecryptedImage } from "../../../../types";

export async function processPriorityItems(
  priorityColdItems: any[], cachedItems: DecryptedImage[], append: boolean,
  securityImageId: string | null, isExtraUnlocked: boolean | undefined,
  extraPassword: string | null, cryptoKey: any, decryptedCache: Map<string, string>,
  setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>, setLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  if (priorityColdItems.length > 0) {
    const decrypted = await Promise.all(
      priorityColdItems.map((img) => decryptSingleThumbnail(img, securityImageId, isExtraUnlocked, extraPassword, cryptoKey, decryptedCache))
    );
    setImages((prev) => {
      const base = (cachedItems.length === 0 && !append) ? [] : prev;
      const map = new Map(base.map((p) => [p.id, p]));
      for (const res of decrypted) {
        const ex = map.get(res.id);
        if (ex?.url && !res.url && (res.failed || res.isMissing)) continue; // falha antiga não apaga foto já carregada
        map.set(res.id, res);
      }
      const final = Array.from(map.values());
      final.sort((a, b) => b.createdAt - a.createdAt);
      return final;
    });
    setLoading(false);
  } else if (cachedItems.length === 0) {
    setLoading(false);
  }
}
