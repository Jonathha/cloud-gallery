import { useAuth } from "../../contexts/AuthContext";
import { UseTrashOperationsProps } from "./useTrashOperations/types";
import { useTrashRestore } from "./useTrashOperations/useTrashRestore";
import { useTrashDelete } from "./useTrashOperations/useTrashDelete";

export function useTrashOperations({
  images,
  setImages,
  selectedIds,
  setSelectedIds,
  setSelectedImage,
  setIsRestoring,
  setIsDeleting,
  setIsConfirmDeleteOpen,
  setIsConfirmDeleteMultipleOpen,
  setIsConfirmEmptyOpen,
  showToast,
  loadTrashItems,
}: UseTrashOperationsProps) {
  const { user } = useAuth();

  const { handleRestore, handleRestoreMultiple } = useTrashRestore({
    user,
    setImages,
    selectedIds,
    setSelectedIds,
    setSelectedImage,
    setIsRestoring,
    showToast,
    loadTrashItems,
  });

  const { handleDeletePermanently, handleDeleteMultiple, handleEmptyTrash } = useTrashDelete({
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
  });

  return {
    handleRestore,
    handleRestoreMultiple,
    handleDeletePermanently,
    handleDeleteMultiple,
    handleEmptyTrash,
  };
}
