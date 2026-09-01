import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getTrashItems } from "../utils/db";
import { ToastType } from "../components/Toast";
import { decryptSingleTrashItem, TrashImage } from "./gallery/trashDecryptHelper";
import { useTrashOperations } from "./trash/useTrashOperations";

export type { TrashImage };

export function useTrashLogic(isOpen: boolean) {
  const { user, cryptoKey, extraPassword, securityImageId } = useAuth();
  const [images, setImages] = useState<TrashImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<TrashImage | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmEmptyOpen, setIsConfirmEmptyOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isConfirmDeleteMultipleOpen, setIsConfirmDeleteMultipleOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [extraPasswordInput, setExtraPasswordInput] = useState("");
  const [isPromptingExtra, setIsPromptingExtra] = useState<string | null>(null);
  const [isExtraUnlocked, setIsExtraUnlocked] = useState(false);

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (isOpen) {
      setIsExtraUnlocked(false);
      setIsPromptingExtra(null);
      setExtraPasswordInput("");
      setSelectedIds([]);
      loadTrashItems();
    }
  }, [isOpen]);

  const loadTrashItems = async () => {
    setLoading(true);
    try {
      const items = await getTrashItems();
      const decryptedItems: TrashImage[] = [];

      for (const item of items) {
        const decrypted = await decryptSingleTrashItem(item, cryptoKey, extraPassword);
        if (decrypted) {
          decryptedItems.push(decrypted);
        }
      }

      decryptedItems.sort((a, b) => ((b.trashedAt || b.deletedAt || 0) - (a.trashedAt || a.deletedAt || 0)));
      setImages(decryptedItems);
    } catch (error) {
      console.error("Error loading trash items:", error);
      showToast("Erro ao carregar lixeira.", "error");
    } finally {
      setLoading(false);
    }
  };

  const ops = useTrashOperations({
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
  });

  const handleSelectImage = (img: TrashImage) => {
    if (selectedIds.length > 0) {
      toggleSelection(img.id);
      return;
    }
    if (img.id === securityImageId && !isExtraUnlocked && extraPassword) {
      setIsPromptingExtra(img.id);
      return;
    }
    setSelectedImage(img);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleLongPress = (id: string) => {
    if (selectedIds.length === 0) {
      toggleSelection(id);
    }
  };

  const triggerEmptyTrash = () => {
    const hasProtected = images.some((img) => img.id === securityImageId);
    if (hasProtected && !isExtraUnlocked && extraPassword) {
      setIsPromptingExtra("empty_trash");
      return;
    }
    setIsConfirmEmptyOpen(true);
  };

  const handleExtraPasswordSubmit = (e?: any) => {
    e?.preventDefault();
    if (extraPasswordInput.trim() === extraPassword?.trim()) {
      setIsExtraUnlocked(true);
      if (isPromptingExtra === "empty_trash") {
        setIsConfirmEmptyOpen(true);
      } else {
        const img = images.find((i) => i.id === isPromptingExtra);
        if (img) {
          setSelectedImage(img);
        }
      }
      setIsPromptingExtra(null);
      setExtraPasswordInput("");
    } else {
      showToast("Senha extra incorreta", "error");
    }
  };

  return {
    images,
    loading,
    isRestoring,
    isDeleting,
    selectedImage,
    setSelectedImage,
    selectedIds,
    setSelectedIds,
    toggleSelection,
    handleLongPress,
    isConfirmEmptyOpen,
    setIsConfirmEmptyOpen,
    isConfirmDeleteOpen,
    setIsConfirmDeleteOpen,
    isConfirmDeleteMultipleOpen,
    setIsConfirmDeleteMultipleOpen,
    toast,
    setToast,
    handleRestore: ops.handleRestore,
    handleRestoreMultiple: ops.handleRestoreMultiple,
    handleDeletePermanently: ops.handleDeletePermanently,
    handleDeleteMultiple: ops.handleDeleteMultiple,
    handleEmptyTrash: ops.handleEmptyTrash,
    extraPassword,
    securityImageId,
    extraPasswordInput,
    setExtraPasswordInput,
    isPromptingExtra,
    setIsPromptingExtra,
    isExtraUnlocked,
    setIsExtraUnlocked,
    handleSelectImage,
    triggerEmptyTrash,
    handleExtraPasswordSubmit,
  };
}
