import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getAuxKeyFromCache } from "../../utils/db";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { dbPrimary } from "../../firebase";
import { fetchAndUnpackImage } from "../../utils/fileCrypto";
import { getApiUrl } from "../../utils/apiUrl";

interface UseProtectedDeletionProps {
  images: any[];
  setImages: React.Dispatch<React.SetStateAction<any[]>>;
  selectedIndex: number | null;
  setSelectedIndex: (idx: number | null) => void;
  loadProtectedImages: () => Promise<void>;
  setToast: (toast: { message: string; type: "success" | "error" | "info" } | null) => void;
}

export function useProtectedDeletion({
  images,
  setImages,
  selectedIndex,
  setSelectedIndex,
  loadProtectedImages,
  setToast,
}: UseProtectedDeletionProps) {
  const { user } = useAuth();
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!imageToDelete) return;
    const id = imageToDelete;

    // 1. OPTIMISTIC UPDATE: Immediately update state and notify user.
    setImages((prev) => prev.filter((img) => img.id !== id));

    if (selectedIndex !== null && images[selectedIndex]?.id === id) {
      setSelectedIndex(null);
    }
    setImageToDelete(null);
    setToast({ message: "Imagem protegida movida para a lixeira!", type: "success" });

    // 2. BACKGROUND PROCESSING: Run deletion asynchronously.
    (async () => {
      try {
        let fullImageJson: any = null;
        let skipTrash = false;
        try {
          const token = user ? await user.getIdToken() : undefined;
          fullImageJson = await fetchAndUnpackImage(id, token);
        } catch (err) {
          console.warn("Erro ao buscar imagem completa do servidor para mover para a lixeira:", err);
          skipTrash = true;
        }

        if (!skipTrash && (!fullImageJson || !fullImageJson.ciphertext)) {
          skipTrash = true;
        }

        if (!skipTrash && fullImageJson && fullImageJson.ciphertext) {
          let auxKey = await getAuxKeyFromCache(id);
          if (!auxKey && user && navigator.onLine) {
            try {
              const keyDoc = await getDoc(doc(dbPrimary, "media_keys", id));
              if (keyDoc.exists()) {
                auxKey = keyDoc.data().auxKey;
              }
            } catch (_) {}
          }

          const { saveToTrash } = await import("../../utils/db");

          await saveToTrash({
            id: fullImageJson.id,
            ciphertext: fullImageJson.ciphertext,
            iv: fullImageJson.iv,
            createdAt: fullImageJson.createdAt,
            trashedAt: Date.now(),
            deletedAt: Date.now(),
            protectedAt: fullImageJson.protectedAt || Date.now(),
            isChunked: fullImageJson.isChunked || false,
            chunkCount: fullImageJson.chunkCount || 1,
            contentType: fullImageJson.contentType || "image/png",
            totalSize: fullImageJson.totalSize || 0,
            thumbnailCiphertext: fullImageJson.thumbnailCiphertext || "",
            thumbnailIv: fullImageJson.thumbnailIv || "",
            fileKeyCiphertext: fullImageJson.fileKeyCiphertext,
            fileKeyIv: fullImageJson.fileKeyIv,
            fileSalt: fullImageJson.fileSalt,
            isProtected: true,
            auxKey: auxKey
          });
        }

        const { removeImageFromCache, removeAuxKeyFromCache } = await import("../../utils/db");
        await removeImageFromCache(id);
        await removeAuxKeyFromCache(id);

        if (user && navigator.onLine) {
          try {
            await deleteDoc(doc(dbPrimary, "media_keys", id));
          } catch (fsErr) {
            console.warn("Erro ao deletar chave auxiliar do Firestore:", fsErr);
          }
          try {
            await deleteDoc(doc(dbPrimary, "images", id));
          } catch (fsErr) {
            console.warn("Erro ao deletar imagem do Firestore:", fsErr);
          }
          try {
            const token = user ? await user.getIdToken() : undefined;
            await fetch(getApiUrl(`/api/storage/image/${id}`), {
              method: "DELETE",
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (serverErr) {
            console.warn("Erro ao deletar do servidor local:", serverErr);
          }
        }
      } catch (error) {
        console.error("Erro ao processar exclusão de imagem protegida em segundo plano:", error);
      }
    })();
  };

  return {
    imageToDelete,
    setImageToDelete,
    handleDelete,
  };
}
