import React, { useState, useRef } from "react";
import { removeFromTrash, removeManyFromTrash, getImageFromTrash } from "../../../utils/db";
import { TrashImage } from "../../gallery/trashDecryptHelper";
import { getApiUrl } from "../../../utils/apiUrl";
import { getSafeAuthToken } from "../../../utils/safeAuthToken";
import { recordAuditEvent } from "../../../services/adminAuditService";
import { addPendingServerDelete } from "../../../utils/pendingServerDeletes";

export interface PermanentDeleteProgress {
  isDeleting: boolean;
  current: number;
  total: number;
  isAll: boolean;
  failed: number;
  photos: number;
  videos: number;
  finished: boolean;
}

const EMPTY_PROGRESS: PermanentDeleteProgress = {
  isDeleting: false,
  current: 0,
  total: 0,
  isAll: false,
  failed: 0,
  photos: 0,
  videos: 0,
  finished: false,
};

interface UseTrashDeleteProps {
  user: any;
  images: TrashImage[];
  setImages: React.Dispatch<React.SetStateAction<TrashImage[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedImage: (img: TrashImage | null) => void;
  setIsDeleting: (val: boolean) => void;
  setIsConfirmDeleteOpen: (val: boolean) => void;
  setIsConfirmDeleteMultipleOpen: (val: boolean) => void;
  setIsConfirmEmptyOpen: (val: boolean) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  loadTrashItems?: () => Promise<void>;
}

export function useTrashDelete({
  user,
  images,
  setImages,
  selectedIds,
  setSelectedIds,
  setSelectedImage,
  setIsDeleting,
  setIsConfirmDeleteOpen,
  setIsConfirmDeleteMultipleOpen,
  setIsConfirmEmptyOpen,
  showToast,
  loadTrashItems,
}: UseTrashDeleteProps) {
  const [deleteProgress, setDeleteProgress] = useState<PermanentDeleteProgress>(EMPTY_PROGRESS);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const finishProgress = (failed: number) => {
    setDeleteProgress((prev) => ({ ...prev, current: prev.total, failed, finished: true }));
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setDeleteProgress(EMPTY_PROGRESS), failed > 0 ? 2800 : 1400);
  };

  const deleteInternal = async (id: string, token?: string): Promise<boolean> => {
    await removeFromTrash(id);
    let ok = false;
    if (navigator.onLine) {
      try {
        const res = await fetch(getApiUrl(`/api/storage/image/${id}`), {
          method: "DELETE",
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        ok = res.ok;
      } catch (err) {
        console.warn(`Erro ao deletar ${id} do storage:`, err);
      }
    }
    // Se não chegou ao servidor, fica na fila para não voltar à galeria na próxima sincronização
    if (!ok) addPendingServerDelete(user?.uid, id);
    return ok;
  };

  const handleDeletePermanently = async (image: TrashImage) => {
    const id = image.id;
    
    setImages((prev) => prev.filter((img) => img.id !== id));
    setSelectedImage(null);
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    setIsConfirmDeleteOpen(false);

    (async () => {
      try {
        const trashMeta = await getImageFromTrash(id).catch(() => undefined);
        const token = await getSafeAuthToken(user);
        const deletedOnServer = await deleteInternal(id, token);
        if (!deletedOnServer) showToast("Não foi possível apagar do servidor agora. Vamos tentar novamente.", "error");
        else showToast("Item excluído permanentemente.");
        recordAuditEvent({
          type: "trash_delete",
          action: "trash_delete",
          userId: user?.uid,
          userEmail: user?.email || "",
          fileName: (trashMeta as any)?.fileName,
          mediaType: trashMeta?.contentType || (image.isVideo ? "video" : "image"),
          fileSize: trashMeta?.totalSize,
          itemCount: 1,
          resourceId: id,
          result: deletedOnServer
            ? "Arquivo excluído permanentemente da lixeira e do armazenamento"
            : "Arquivo excluído da lixeira; falha ao apagar do servidor",
          status: deletedOnServer ? "success" : "error",
          details: `Exclusão permanente da lixeira — Arquivo ID: ${id}`
        });
      } catch (error) {
        console.error("Error deleting image permanently:", error);
        showToast("Erro ao processar exclusão no servidor.", "error");
        if (loadTrashItems) {
          await loadTrashItems();
        }
      }
    })();
  };

  const handleDeleteMultiple = async () => {
    if (selectedIds.length === 0) return;
    
    const idsToDelete = [...selectedIds];
    const total = idsToDelete.length;
    const deletedSet = new Set(idsToDelete);
    
    const videos = images.filter((img) => deletedSet.has(img.id) && img.isVideo).length;
    
    setImages((prev) => prev.filter((img) => !deletedSet.has(img.id)));
    setSelectedIds([]);
    setIsConfirmDeleteMultipleOpen(false);

    clearTimeout(resetTimer.current);
    setDeleteProgress({
      ...EMPTY_PROGRESS,
      isDeleting: true,
      total,
      photos: total - videos,
      videos,
    });

    (async () => {
      setIsDeleting(true);
      let completed = 0;
      let failed = 0;
      try {
        const token = await getSafeAuthToken(user);
        
        for (const id of idsToDelete) {
          try {
            if (!(await deleteInternal(id, token))) failed++;
          } catch (e) {
            console.error(`Failed to delete ${id} permanently`, e);
            failed++;
          }
          completed++;
          setDeleteProgress((prev) => ({ ...prev, current: completed }));
        }
        recordAuditEvent({
          type: "trash_delete",
          action: "trash_delete",
          userId: user?.uid,
          userEmail: user?.email || "",
          itemCount: deletedSet.size,
          resourceId: idsToDelete.slice(0, 5).join(", ") + (idsToDelete.length > 5 ? ` (+${idsToDelete.length - 5})` : ""),
          result: failed > 0
            ? `${deletedSet.size - failed} de ${deletedSet.size} item(ns) excluído(s) do servidor; ${failed} falharam`
            : `${deletedSet.size} item(ns) excluído(s) permanentemente da lixeira`,
          status: failed > 0 ? "error" : "success",
          details: `Exclusão permanente em lote da lixeira: ${deletedSet.size} arquivo(s)`
        });
        if (failed > 0) showToast(`${failed} de ${total} não foram apagados do servidor.`, "error");
        else showToast(`${deletedSet.size} itens excluídos permanentemente.`);
      } catch (error) {
        console.error("Error deleting multiple images:", error);
        failed += total - completed;
        showToast("Erro ao processar exclusão em lote.", "error");
        if (loadTrashItems) {
          await loadTrashItems();
        }
      } finally {
        setIsDeleting(false);
        finishProgress(failed);
      }
    })();
  };

  const handleEmptyTrash = async () => {
    const itemsToEmpty = [...images];
    const total = itemsToEmpty.length;
    
    const videos = itemsToEmpty.filter((img) => img.isVideo).length;
    
    setImages([]);
    setSelectedIds([]);
    setIsConfirmEmptyOpen(false);

    clearTimeout(resetTimer.current);
    setDeleteProgress({
      ...EMPTY_PROGRESS,
      isDeleting: true,
      total,
      isAll: true,
      photos: total - videos,
      videos,
    });

    (async () => {
      setIsDeleting(true);
      let completed = 0;
      let failed = 0;
      try {
        // Remove apenas os itens do usuário atual (a store é compartilhada entre contas no dispositivo)
        await removeManyFromTrash(itemsToEmpty.map((item) => item.id));

        if (navigator.onLine) {
          const token = await getSafeAuthToken(user);

          for (const item of itemsToEmpty) {
            let ok = false;
            try {
              const res = await fetch(getApiUrl(`/api/storage/image/${item.id}`), {
                method: "DELETE",
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
              });
              ok = res.ok;
            } catch (e) {}
            if (!ok) {
              failed++;
              addPendingServerDelete(user?.uid, item.id);
            }
            completed++;
            setDeleteProgress((prev) => ({ ...prev, current: completed }));
          }
        } else {
          for (const item of itemsToEmpty) addPendingServerDelete(user?.uid, item.id);
          failed = total;
        }
        recordAuditEvent({
          type: "trash_delete",
          action: "trash_delete",
          userId: user?.uid,
          userEmail: user?.email || "",
          itemCount: total,
          result: failed > 0
            ? `Lixeira esvaziada localmente; ${failed} de ${total} item(ns) não foram apagados do servidor`
            : `Lixeira esvaziada permanentemente (${total} item(ns) removido(s))`,
          status: failed > 0 ? "error" : "success",
          details: `Esvaziamento completo da lixeira (${total} arquivo(s) excluído(s) permanentemente)`
        });
        if (failed > 0) showToast(`${failed} de ${total} não foram apagados do servidor.`, "error");
        else showToast("Lixeira esvaziada com sucesso!");
      } catch (error) {
        console.error("Error emptying trash in background:", error);
        failed += total - completed;
        showToast("Erro ao esvaziar lixeira no servidor.", "error");
        if (loadTrashItems) {
          await loadTrashItems();
        }
      } finally {
        setIsDeleting(false);
        finishProgress(failed);
      }
    })();
  };

  return { handleDeletePermanently, handleDeleteMultiple, handleEmptyTrash, deleteProgress };
}
