import React from "react";
import { getTrashItems, removeFromTrash, saveImageToCache } from "../../../utils/db";
import { TrashImage } from "../../gallery/trashDecryptHelper";
import { getApiUrl } from "../../../utils/apiUrl";

interface UseTrashRestoreProps {
  user: any;
  setImages: React.Dispatch<React.SetStateAction<TrashImage[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedImage: (img: TrashImage | null) => void;
  setIsRestoring: (val: boolean) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  loadTrashItems?: () => Promise<void>;
}

export function useTrashRestore({
  user,
  setImages,
  selectedIds,
  setSelectedIds,
  setSelectedImage,
  setIsRestoring,
  showToast,
  loadTrashItems,
}: UseTrashRestoreProps) {
  const restoreInternal = async (
    id: string,
    setDocRef?: any,
    docRef?: any,
    serverTimestampRef?: any,
    dbPrimaryRef?: any,
    token?: string
  ) => {
    if (!user) return;
    const items = await getTrashItems();
    const trashItem = items.find((i) => i.id === id);

    if (!trashItem) throw new Error("Item not found in trash");

    try {
      const activeToken = token || (await user.getIdToken());
      await fetch(getApiUrl("/api/storage/upload"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          id: trashItem.id,
          userId: user.uid,
          ciphertext: trashItem.ciphertext,
          iv: trashItem.iv,
          contentType: trashItem.contentType,
          totalSize: trashItem.totalSize,
          thumbnailCiphertext: trashItem.thumbnailCiphertext,
          thumbnailIv: trashItem.thumbnailIv,
          isChunked: trashItem.isChunked || false,
          chunkCount: trashItem.chunkCount || 1,
          fileKeyCiphertext: trashItem.fileKeyCiphertext,
          fileKeyIv: trashItem.fileKeyIv,
          fileSalt: trashItem.fileSalt,
          isProtected: trashItem.isProtected || false,
        }),
      });
    } catch (err) {
      console.warn("Erro ao restaurar no servidor local:", err);
    }

    await removeFromTrash(id);

    if (trashItem.isProtected) {
      if (trashItem.auxKey) {
        try {
          const { saveAuxKeyToCache } = await import("../../../utils/db");
          await saveAuxKeyToCache(trashItem.id, trashItem.auxKey);
        } catch (_) {}

        if (navigator.onLine && setDocRef && docRef && dbPrimaryRef) {
          try {
            await setDocRef(docRef(dbPrimaryRef, "media_keys", trashItem.id), {
              auxKey: trashItem.auxKey,
              userId: user.uid,
              createdAt: trashItem.createdAt || (serverTimestampRef ? serverTimestampRef() : new Date()),
              protectedAt: trashItem.protectedAt || (serverTimestampRef ? serverTimestampRef() : new Date()),
              restoredAt: serverTimestampRef ? serverTimestampRef() : new Date(),
            });
          } catch (fsErr) {
            console.warn("Erro ao restaurar chave auxiliar no Firestore:", fsErr);
          }
        }
      }
    } else {
      await saveImageToCache({
        id: trashItem.id,
        ciphertext: trashItem.ciphertext,
        iv: trashItem.iv,
        createdAt: trashItem.createdAt,
        isChunked: trashItem.isChunked || false,
        chunkCount: trashItem.chunkCount || 1,
        contentType: trashItem.contentType || "image/png",
        totalSize: trashItem.totalSize || 0,
        thumbnailCiphertext: trashItem.thumbnailCiphertext || "",
        thumbnailIv: trashItem.thumbnailIv || "",
        fileKeyCiphertext: trashItem.fileKeyCiphertext,
        fileKeyIv: trashItem.fileKeyIv,
        fileSalt: trashItem.fileSalt,
      });

      if (navigator.onLine && setDocRef && docRef && dbPrimaryRef) {
        try {
          const rawCreatedAt = trashItem.createdAt;
          const uploadDate = rawCreatedAt ? new Date(rawCreatedAt) : new Date();
          const formattedDate = uploadDate.toLocaleDateString('pt-BR');
          const formattedTime = uploadDate.toLocaleTimeString('pt-BR');
          const isoUploadDate = uploadDate.toISOString();
          const fallbackExt = trashItem.contentType ? trashItem.contentType.split('/')[1]?.toUpperCase() || 'JPEG' : 'JPEG';
          
          await setDocRef(docRef(dbPrimaryRef, 'images', trashItem.id), {
            id: trashItem.id,
            userId: user.uid,
            userEmail: user.email || '',
            userName: user.displayName || user.email?.split('@')[0] || 'Anônimo',
            imageUrl: `/api/storage/image/${trashItem.id}`,
            createdAt: trashItem.createdAt,
            restoredAt: serverTimestampRef ? serverTimestampRef() : new Date(),
            uploadedAt: isoUploadDate,
            timestamp: trashItem.createdAt,
            date: formattedDate,
            time: formattedTime,
            horario: `${formattedDate} às ${formattedTime}`,
            fileName: `midia_${trashItem.id}.${fallbackExt.toLowerCase()}`,
            name: `midia_${trashItem.id}.${fallbackExt.toLowerCase()}`,
            size: trashItem.totalSize || 0,
            fileSize: trashItem.totalSize || 0,
            width: 0,
            height: 0,
            format: fallbackExt,
            formato: fallbackExt,
            type: trashItem.contentType?.startsWith('video') ? 'video' : 'image',
            status: 'aprovada',
            iv: trashItem.iv || "",
            contentType: trashItem.contentType || "image/jpeg",
            totalSize: trashItem.totalSize || 0,
            isChunked: trashItem.isChunked || false,
            chunkCount: trashItem.chunkCount || 1,
            thumbnailCiphertext: trashItem.thumbnailCiphertext || "",
            thumbnailIv: trashItem.thumbnailIv || "",
            fileKeyCiphertext: trashItem.fileKeyCiphertext || "",
            fileKeyIv: trashItem.fileKeyIv || "",
            fileSalt: trashItem.fileSalt || ""
          });
        } catch (fsErr) {
          console.warn('Erro ao restaurar metadados da imagem no Firestore:', fsErr);
        }
      }
    }
  };

  const handleRestore = async (image: TrashImage) => {
    if (!user) return;
    
    setImages((prev) => prev.filter((img) => img.id !== image.id));
    setSelectedImage(null);
    setSelectedIds((prev) => prev.filter((id) => id !== image.id));
    showToast("Item sendo restaurado...", "success");

    (async () => {
      setIsRestoring(true);
      try {
        let setDocRef, docRef, serverTimestampRef, dbPrimaryRef;
        if (navigator.onLine) {
          const fs = await import("firebase/firestore");
          setDocRef = fs.setDoc;
          docRef = fs.doc;
          serverTimestampRef = fs.serverTimestamp;
          const { dbPrimary } = await import("../../../firebase");
          dbPrimaryRef = dbPrimary;
        }

        const token = await user.getIdToken();
        await restoreInternal(image.id, setDocRef, docRef, serverTimestampRef, dbPrimaryRef, token);
        
        if (image.protectedAt) {
          window.dispatchEvent(new CustomEvent("refresh-protected-gallery"));
        } else {
          window.dispatchEvent(new CustomEvent("refresh-gallery-list"));
        }
        showToast("Item restaurado com sucesso!", "success");
      } catch (error) {
        console.error("Error restoring image:", error);
        showToast("Erro ao restaurar item.", "error");
        if (loadTrashItems) {
          await loadTrashItems();
        }
      } finally {
        setIsRestoring(false);
      }
    })();
  };

  const handleRestoreMultiple = async () => {
    if (!user || selectedIds.length === 0) return;
    
    const idsToRestore = [...selectedIds];
    const restoredSet = new Set(idsToRestore);
    
    setImages((prev) => prev.filter((img) => !restoredSet.has(img.id)));
    setSelectedIds([]);
    showToast("Restaurando itens...", "success");

    (async () => {
      setIsRestoring(true);
      try {
        let setDocRef, docRef, serverTimestampRef, dbPrimaryRef;
        if (navigator.onLine) {
          const fs = await import("firebase/firestore");
          setDocRef = fs.setDoc;
          docRef = fs.doc;
          serverTimestampRef = fs.serverTimestamp;
          const { dbPrimary } = await import("../../../firebase");
          dbPrimaryRef = dbPrimary;
        }

        const token = await user.getIdToken();
        
        await Promise.all(
          idsToRestore.map(async (id) => {
            try {
              await restoreInternal(id, setDocRef, docRef, serverTimestampRef, dbPrimaryRef, token);
            } catch (e) {
              console.error(`Failed to restore ${id}`, e);
            }
          })
        );

        window.dispatchEvent(new CustomEvent("refresh-gallery-list"));
        window.dispatchEvent(new CustomEvent("refresh-protected-gallery"));
        showToast(`${restoredSet.size} itens restaurados com sucesso!`, "success");
      } catch (error) {
        console.error("Error restoring items:", error);
        showToast("Erro ao restaurar itens.", "error");
        if (loadTrashItems) {
          await loadTrashItems();
        }
      } finally {
        setIsRestoring(false);
      }
    })();
  };

  return { handleRestore, handleRestoreMultiple };
}
