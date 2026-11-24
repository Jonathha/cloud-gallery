import { User } from 'firebase/auth';
import { TrashImage } from '../../gallery/trashDecryptHelper';
import { getApiUrl } from '../../../utils/apiUrl';
import { removeFromTrash, saveImageToCache, getImageFromTrash } from '../../../utils/db';
import { removePendingServerDelete } from '../../../utils/pendingServerDeletes';
import { saveMediaKeyApi } from '../../../services/vaultApiService';

// Restaurações simultâneas ao restaurar vários itens (cada uma reenvia o arquivo inteiro ao servidor)
const RESTORE_CONCURRENCY = 4;

interface UseTrashRestoreProps {
  user: User | null;
  selectedIds: string[];
  setImages: React.Dispatch<React.SetStateAction<TrashImage[]>>;
  setSelectedImage: (img: TrashImage | null) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setIsRestoring: (restoring: boolean) => void;
  loadTrashItems?: () => Promise<void>;
}

export function useTrashRestore({
  user,
  selectedIds,
  setImages,
  setSelectedImage,
  setSelectedIds,
  showToast,
  setIsRestoring,
  loadTrashItems,
}: UseTrashRestoreProps) {

  const restoreInternal = async (
    id: string,
    token: string
  ) => {
    if (!user) return false;
    const trashItem = await getImageFromTrash(id);
    if (!trashItem) return false;

    // Cancela exclusão pendente no servidor para não apagar a mídia que está sendo restaurada
    removePendingServerDelete(user.uid, id);

    // A galeria ignora ids de "apagados recentemente" (remoteMerge); sem remover aqui, a mídia restaurada some da tela
    try {
      const deletedList: string[] = JSON.parse(sessionStorage.getItem('recently_deleted_ids_v1') || '[]');
      if (deletedList.includes(id)) {
        sessionStorage.setItem('recently_deleted_ids_v1', JSON.stringify(deletedList.filter((x) => x !== id)));
      }
    } catch {}

    try {
      await fetch(getApiUrl("/api/storage/upload"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
      console.warn("Erro ao restaurar no servidor:", err);
    }

    await removeFromTrash(id);

    if (trashItem.isProtected) {
      if (trashItem.auxKey) {
        try {
          const { saveAuxKeyToCache } = await import("../../../utils/db");
          await saveAuxKeyToCache(trashItem.id, trashItem.auxKey);
        } catch (_) {}

        try {
          await saveMediaKeyApi(user, {
            imageId: trashItem.id,
            auxKey: trashItem.auxKey,
            keyCiphertext: trashItem.auxKey,
            isProtected: true,
            createdAt: trashItem.createdAt || Date.now(),
          });
        } catch (keyErr) {
          console.warn("Erro ao restaurar chave protegida no D1:", keyErr);
        }
      }
    } else {
      await saveImageToCache({
        id: trashItem.id,
        userId: user.uid,
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
    }
    return true;
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
        const token = await user.getIdToken();
        const restored = await restoreInternal(image.id, token);
        if (!restored) {
          showToast("Item não encontrado na lixeira.", "error");
          if (loadTrashItems) await loadTrashItems();
          return;
        }
        
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

  const restoreMany = async (idsToRestore: string[]) => {
    if (!user || idsToRestore.length === 0) return;
    
    const restoredSet = new Set(idsToRestore);
    
    setImages((prev) => prev.filter((img) => !restoredSet.has(img.id)));
    setSelectedIds([]);
    showToast("Restaurando itens...", "success");

    (async () => {
      setIsRestoring(true);
      try {
        const token = await user.getIdToken();
        
        let restoredCount = 0;
        const queue = [...idsToRestore];
        const worker = async () => {
          for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
            try {
              const ok = await restoreInternal(id, token);
              if (ok) restoredCount++;
            } catch (e) {
              console.error(`Failed to restore ${id}`, e);
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(RESTORE_CONCURRENCY, queue.length) }, worker));

        if (restoredCount === 0) {
          showToast("Nenhum item pôde ser restaurado.", "error");
          if (loadTrashItems) await loadTrashItems();
          return;
        }

        window.dispatchEvent(new CustomEvent("refresh-gallery-list"));
        window.dispatchEvent(new CustomEvent("refresh-protected-gallery"));
        showToast(
          restoredCount === idsToRestore.length
            ? `${restoredCount} itens restaurados com sucesso!`
            : `${restoredCount} de ${idsToRestore.length} itens restaurados.`,
          restoredCount === idsToRestore.length ? "success" : "error"
        );
        // Parcial: o que falhou foi tirado da tela de forma otimista; recarrega para mostrar o que sobrou na lixeira
        if (restoredCount < idsToRestore.length && loadTrashItems) await loadTrashItems();
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

  const handleRestoreMultiple = () => restoreMany([...selectedIds]);
  const handleRestoreAll = (ids: string[]) => restoreMany([...ids]);

  return { handleRestore, handleRestoreMultiple, handleRestoreAll };
}
