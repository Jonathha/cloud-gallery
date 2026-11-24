import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getAuxKeyFromCache } from "../../utils/db";
import { fetchAndUnpackImage } from "../../utils/fileCrypto";
import { getApiUrl } from "../../utils/apiUrl";
import { getSafeAuthToken } from "../../utils/safeAuthToken";
import { recordAuditEvent } from "../../services/adminAuditService";
import { addPendingServerDelete } from "../../utils/pendingServerDeletes";

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
        let token: string | undefined;
        try {
          token = await getSafeAuthToken(user);
        } catch {}

        try {
          fullImageJson = await fetchAndUnpackImage(id, token);
        } catch (err) {
          console.warn("Erro ao buscar imagem completa do servidor para mover para a lixeira:", err);
          skipTrash = true;
        }

        if (!skipTrash && (!fullImageJson || !fullImageJson.ciphertext)) {
          skipTrash = true;
        }

        if (!skipTrash && fullImageJson && fullImageJson.ciphertext) {
          const auxKey = await getAuxKeyFromCache(id);

          const { saveToTrash, removeImageFromCache, removeAuxKeyFromCache } = await import("../../utils/db");

          await saveToTrash({
            id: fullImageJson.id || id,
            userId: user?.uid || fullImageJson.userId,
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

          await removeImageFromCache(id);
          await removeAuxKeyFromCache(id);
          window.dispatchEvent(new CustomEvent("trash-updated"));

          try {
            const deletedList = JSON.parse(sessionStorage.getItem('recently_deleted_ids_v1') || '[]');
            if (!deletedList.includes(id)) {
              deletedList.push(id);
              sessionStorage.setItem('recently_deleted_ids_v1', JSON.stringify(deletedList));
            }
          } catch {}

          recordAuditEvent({
            type: "file_delete",
            action: "file_delete",
            userId: user?.uid,
            userEmail: user?.email || "",
            fileName: fullImageJson.fileName,
            mediaType: fullImageJson.contentType || "image/png",
            fileSize: fullImageJson.totalSize || undefined,
            itemCount: 1,
            resourceId: id,
            result: "Imagem protegida movida para a lixeira com sucesso",
            status: "success",
            details: `Imagem protegida ID ${id} movida para a lixeira`
          });

          let serverDeleted = false;
          if (user && navigator.onLine) {
            try {
              const res = await fetch(getApiUrl(`/api/storage/image/${id}`), {
                method: "DELETE",
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
              });
              serverDeleted = res.ok;
            } catch (serverErr) {
              console.warn("Erro ao deletar do servidor:", serverErr);
            }
          }
          if (user && !serverDeleted) addPendingServerDelete(user.uid, id);
        } else {
          await loadProtectedImages();
          setToast({ message: "Não foi possível mover a imagem protegida para a lixeira.", type: "error" });
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
