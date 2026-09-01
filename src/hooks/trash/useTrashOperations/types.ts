import React from "react";
import { TrashImage } from "../../gallery/trashDecryptHelper";

export interface UseTrashOperationsProps {
  images: TrashImage[];
  setImages: React.Dispatch<React.SetStateAction<TrashImage[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedImage: (img: TrashImage | null) => void;
  setIsRestoring: (val: boolean) => void;
  setIsDeleting: (val: boolean) => void;
  setIsConfirmDeleteOpen: (val: boolean) => void;
  setIsConfirmDeleteMultipleOpen: (val: boolean) => void;
  setIsConfirmEmptyOpen: (val: boolean) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  loadTrashItems?: () => Promise<void>;
}
