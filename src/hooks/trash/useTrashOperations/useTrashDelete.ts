import React from "react";
import { removeFromTrash, clearTrash } from "../../../utils/db";
import { TrashImage } from "../../gallery/trashDecryptHelper";
import { getApiUrl } from "../../../utils/apiUrl";

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
  const deleteInternal = async (
    id: string,
    deleteDocRef?: any,
    docRef?: any,
    dbPrimaryRef?: any,
    token?: string
  ) => {
    await removeFromTrash(id);
    if (user && navigator.onLine) {
      if (token) {
        try {
          await fetch(getApiUrl(`/api/storage/image/${id}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
        } catch (err) {
          console.warn(`Erro ao deletar ${id} do storage:`, err);
        }
      }
      if (deleteDocRef && docRef && dbPrimaryRef) {
        try {
          await deleteDocRef(docRef(dbPrimaryRef, "media_keys", id));
          await deleteDocRef(docRef(dbPrimaryRef, "images", id));
        } catch (fsErr) {
          console.warn(`Erro ao deletar metadados de ${id} no Firestore:`, fsErr);
        }
      }
    }
  };

  const handleDeletePermanently = async (image: TrashImage) => {
    const id = image.id;
    
    setImages((prev) => prev.filter((img) => img.id !== id));
    setSelectedImage(null);
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    setIsConfirmDeleteOpen(false);
    showToast("Item excluído permanentemente.");

    (async () => {
      try {
        let deleteDocRef, docRef, dbPrimaryRef;
        if (user && navigator.onLine) {
          const fs = await import("firebase/firestore");
          deleteDocRef = fs.deleteDoc;
          docRef = fs.doc;
          const { dbPrimary } = await import("../../../firebase");
          dbPrimaryRef = dbPrimary;
        }
        
        const token = user ? await user.getIdToken() : undefined;
        await deleteInternal(id, deleteDocRef, docRef, dbPrimaryRef, token);
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
    const deletedSet = new Set(idsToDelete);
    
    setImages((prev) => prev.filter((img) => !deletedSet.has(img.id)));
    setSelectedIds([]);
    setIsConfirmDeleteMultipleOpen(false);
    showToast(`${deletedSet.size} itens excluídos.`);

    (async () => {
      setIsDeleting(true);
      try {
        let deleteDocRef, docRef, dbPrimaryRef;
        if (user && navigator.onLine) {
          const fs = await import("firebase/firestore");
          deleteDocRef = fs.deleteDoc;
          docRef = fs.doc;
          const { dbPrimary } = await import("../../../firebase");
          dbPrimaryRef = dbPrimary;
        }

        const token = user ? await user.getIdToken() : undefined;
        
        await Promise.all(
          idsToDelete.map(async (id) => {
            try {
              await deleteInternal(id, deleteDocRef, docRef, dbPrimaryRef, token);
            } catch (e) {
              console.error(`Failed to delete ${id} permanently`, e);
            }
          })
        );
      } catch (error) {
        console.error("Error deleting multiple images:", error);
        showToast("Erro ao processar exclusão em lote.", "error");
        if (loadTrashItems) {
          await loadTrashItems();
        }
      } finally {
        setIsDeleting(false);
      }
    })();
  };

  const handleEmptyTrash = async () => {
    const itemsToEmpty = [...images];
    
    setImages([]);
    setSelectedIds([]);
    setIsConfirmEmptyOpen(false);
    showToast("Lixeira esvaziada!");

    (async () => {
      setIsDeleting(true);
      try {
        await clearTrash();

        if (user && navigator.onLine) {
          const fs = await import("firebase/firestore");
          const deleteDocRef = fs.deleteDoc;
          const docRef = fs.doc;
          const { dbPrimary } = await import("../../../firebase");
          const dbPrimaryRef = dbPrimary;
          const token = await user.getIdToken();

          await Promise.all(
            itemsToEmpty.map(async (item) => {
              try {
                await fetch(getApiUrl(`/api/storage/image/${item.id}`), {
                  method: "DELETE",
                  headers: { "Authorization": `Bearer ${token}` }
                });
              } catch (e) {}
              try {
                await deleteDocRef(docRef(dbPrimaryRef, "media_keys", item.id));
              } catch (e) {}
              try {
                await deleteDocRef(docRef(dbPrimaryRef, "images", item.id));
              } catch (e) {}
            })
          );
        }
      } catch (error) {
        console.error("Error emptying trash in background:", error);
        showToast("Erro ao esvaziar lixeira no servidor.", "error");
        if (loadTrashItems) {
          await loadTrashItems();
        }
      } finally {
        setIsDeleting(false);
      }
    })();
  };

  return { handleDeletePermanently, handleDeleteMultiple, handleEmptyTrash };
}
