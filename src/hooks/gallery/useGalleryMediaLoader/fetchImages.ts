import React from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { dbPrimary } from "../../../firebase";
import { getAllImagesFromCache, saveImageToCache } from "../../../utils/db";
import { getApiUrl } from "../../../utils/apiUrl";

interface LoadImagesHelperParams {
  user: any;
  cryptoKey: any;
  decryptedCache: React.MutableRefObject<Map<string, string>>;
  setImages: any;
  setLoading: any;
  setSyncStatus: any;
  processAndSetImages: (imageList: any[], append?: boolean) => Promise<void>;
  migrationDismissedRef: React.MutableRefObject<boolean>;
  setIsMigrationNeeded: (val: boolean) => void;
  setMigrationItems: (val: any[]) => void;
  pendingSyncRef: React.MutableRefObject<{ items: any[]; token: string } | null>;
  setCloudMediaCount: (val: number) => void;
  setShowDownloadPrompt: (val: boolean) => void;
  executeBackgroundSync: (items: any[], token: string) => Promise<void>;
}

export async function loadImagesHelper({
  user,
  cryptoKey,
  decryptedCache,
  setImages,
  setLoading,
  setSyncStatus,
  processAndSetImages,
  migrationDismissedRef,
  setIsMigrationNeeded,
  setMigrationItems,
  pendingSyncRef,
  setCloudMediaCount,
  setShowDownloadPrompt,
  executeBackgroundSync,
}: LoadImagesHelperParams) {
  if (sessionStorage.getItem('is_fake_vault_active') === 'true') {
    setImages([]);
    setLoading(false);
    setSyncStatus("synced");
    return;
  }
  if (!user || !cryptoKey) return;
  try {
    setLoading(true);

    const cachedImages = await getAllImagesFromCache();
    if (cachedImages && cachedImages.length > 0) {
      await processAndSetImages(cachedImages, false);
    } else {
      setImages([]);
    }

    if (!navigator.onLine) {
      setSyncStatus("local-only");
      setLoading(false);
      return;
    }

    const tokenPromise = user.getIdToken(false).catch(() => "");
    const tokenTimeout = new Promise<string>((resolve) => setTimeout(() => resolve(""), 2000));
    const token = await Promise.race([tokenPromise, tokenTimeout]);

    const serverFetchPromise = fetch(getApiUrl(`/api/storage/images?userId=${user.uid}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);

    const firestoreFetchPromise = getDocs(query(collection(dbPrimary, 'images'), where('userId', '==', user.uid)))
      .then((snap) => {
        const set = new Set<string>();
        const items: any[] = [];
        snap.docs.forEach((docSnap) => {
          set.add(docSnap.id);
          const data = docSnap.data();
          if (data && data.id) {
            set.add(String(data.id));
            if (!data.isProtected) {
              items.push({
                id: data.id,
                ciphertext: data.ciphertext || "",
                iv: data.iv || "",
                createdAt: (data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt) || (data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp),
                isChunked: false,
                chunkCount: 1,
                contentType: data.contentType || "image/jpeg",
                totalSize: data.totalSize || data.fileSize || 0,
                thumbnailCiphertext: data.thumbnailCiphertext || "",
                thumbnailIv: data.thumbnailIv || "",
                fileKeyCiphertext: data.fileKeyCiphertext || "",
                fileKeyIv: data.fileKeyIv || "",
                fileSalt: data.fileSalt || "",
              });
            }
          }
        });
        return { success: true, ids: set, items };
      })
      .catch((err) => {
        console.warn("[useGalleryMediaLoader] Error checking Firebase 'images' collection:", err);
        return { success: false, ids: new Set<string>(), items: [] };
      });

    const newImagesFoundList: any[] = [];
    const alteredImagesFoundList: any[] = [];

    const [data, firestoreRes] = await Promise.all([serverFetchPromise, firestoreFetchPromise]);

    if (firestoreRes.success) {
      const firebaseImageIds = firestoreRes.ids;
      const missingImages = cachedImages.filter((img) => !firebaseImageIds.has(img.id));

      localStorage.removeItem("migration_dismissed_v1");

      if (missingImages.length > 0 && !migrationDismissedRef.current) {
        console.log("[useGalleryMediaLoader] Images found locally but missing in Firebase 'images' collection:", missingImages.length);
        setIsMigrationNeeded(true);
        setMigrationItems(missingImages);
      } else {
        setIsMigrationNeeded(false);
        setMigrationItems([]);
      }
    }

    const remoteList: any[] = [];
    const seenIds = new Set<string>();
    if (data && data.success && Array.isArray(data.images)) {
      for (const img of data.images) {
        if (!seenIds.has(img.id)) {
          seenIds.add(img.id);
          remoteList.push(img);
        }
      }
    }
    if (firestoreRes && Array.isArray(firestoreRes.items)) {
      for (const img of firestoreRes.items) {
        if (!seenIds.has(img.id)) {
          seenIds.add(img.id);
          remoteList.push(img);
        }
      }
    }

    if (remoteList.length > 0) {
      const cachedMap = new Map(cachedImages.map((img: any) => [img.id, img]));
      const mergedMap = new Map(cachedImages.map((img: any) => [img.id, img]));

      for (const serverImg of remoteList) {
        const cached = cachedMap.get(serverImg.id);
        if (!cached) {
          const loadedImage = {
            id: serverImg.id,
            ciphertext: serverImg.ciphertext || (serverImg.isChunked ? "chunked_vault_data" : ""),
            iv: serverImg.iv || "",
            createdAt: serverImg.createdAt,
            isChunked: serverImg.isChunked || false,
            chunkCount: serverImg.chunkCount || 1,
            contentType: serverImg.contentType || "image/png",
            totalSize: serverImg.totalSize || 0,
            thumbnailCiphertext: serverImg.thumbnailCiphertext || "",
            thumbnailIv: serverImg.thumbnailIv || "",
            fileKeyCiphertext: serverImg.fileKeyCiphertext,
            fileKeyIv: serverImg.fileKeyIv,
            fileSalt: serverImg.fileSalt,
          };
          await saveImageToCache(loadedImage);
          mergedMap.set(loadedImage.id, loadedImage);
          newImagesFoundList.push(loadedImage);
        } else {
          const isAltered = 
            cached.createdAt !== serverImg.createdAt ||
            (serverImg.thumbnailCiphertext && cached.thumbnailCiphertext !== serverImg.thumbnailCiphertext) ||
            cached.contentType !== (serverImg.contentType || "image/png") ||
            cached.totalSize !== (serverImg.totalSize || 0);

          if (isAltered) {
            const updatedImage = {
              ...cached,
              createdAt: serverImg.createdAt,
              contentType: serverImg.contentType || "image/png",
              totalSize: serverImg.totalSize || 0,
              thumbnailCiphertext: serverImg.thumbnailCiphertext || cached.thumbnailCiphertext || "",
              thumbnailIv: serverImg.thumbnailIv || cached.thumbnailIv || "",
              fileKeyCiphertext: serverImg.fileKeyCiphertext || cached.fileKeyCiphertext,
              fileKeyIv: serverImg.fileKeyIv || cached.fileKeyIv,
              fileSalt: serverImg.fileSalt || cached.fileSalt,
            };
            await saveImageToCache(updatedImage);
            mergedMap.set(updatedImage.id, updatedImage);
            newImagesFoundList.push(updatedImage);
            alteredImagesFoundList.push(updatedImage);
          }
        }
      }

      if (navigator.onLine && remoteList.length > 0) {
        const itemsToSync = [...newImagesFoundList, ...alteredImagesFoundList].filter(
          (img) => !img.isChunked && (!img.ciphertext || img.ciphertext === "chunked_vault_data")
        );

        pendingSyncRef.current = { items: itemsToSync, token };
        setCloudMediaCount(remoteList.length);

        const pref = localStorage.getItem('gallery_download_pref') || sessionStorage.getItem('gallery_download_pref');
        if (pref === 'full') {
          if (itemsToSync.length > 0) {
            executeBackgroundSync(itemsToSync, token);
          }
        } else if (pref === 'thumbnails_only') {
          // Keep thumbnails only, no full media background download
        } else {
          setShowDownloadPrompt(true);
        }
      }

      const finalMergedList = Array.from(mergedMap.values());
      await processAndSetImages(finalMergedList, false);
      setSyncStatus("synced");
    } else {
      if (cachedImages.length > 0) {
        await processAndSetImages(cachedImages, false);
      } else {
        await processAndSetImages([]);
      }
      setSyncStatus("local-only");
    }
  } catch (err) {
    console.error("Error loading images:", err);
  } finally {
    setLoading(false);
  }
}
