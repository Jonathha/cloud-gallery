import React from "react";
import DeleteMediaModal from "../DeleteMediaModal";

interface GalleryConfirmModalsProps {
  imageToDelete: string | null;
  setImageToDelete: (id: string | null) => void;
  handleDelete: () => Promise<void>;
  isDeletingMultiple: boolean;
  setIsDeletingMultiple: (val: boolean) => void;
  handleDeleteMultiple: () => Promise<void>;
  selectedForDeletion: string[];
  isCleaningDuplicates: boolean;
  setIsCleaningDuplicates: (val: boolean) => void;
  handleCleanDuplicates: () => Promise<void>;
  duplicatesToDelete: string[];
}

export default function GalleryConfirmModals({
  imageToDelete,
  setImageToDelete,
  handleDelete,
  isDeletingMultiple,
  setIsDeletingMultiple,
  handleDeleteMultiple,
  selectedForDeletion,
  isCleaningDuplicates,
  setIsCleaningDuplicates,
  handleCleanDuplicates,
  duplicatesToDelete,
}: GalleryConfirmModalsProps) {
  return (
    <>
      <DeleteMediaModal
        isOpen={!!imageToDelete}
        onClose={() => setImageToDelete(null)}
        onConfirm={handleDelete}
        title="Excluir arquivo?"
        message="Tem certeza que deseja excluir esta mídia do cofre?"
        confirmText="Excluir"
        cancelText="Cancelar"
      />
      <DeleteMediaModal
        isOpen={isDeletingMultiple}
        onClose={() => setIsDeletingMultiple(false)}
        onConfirm={handleDeleteMultiple}
        title={`Excluir ${selectedForDeletion.length} itens?`}
        message="Os arquivos selecionados serão movidos para a lixeira."
        confirmText="Excluir"
        cancelText="Cancelar"
      />
      <DeleteMediaModal
        isOpen={isCleaningDuplicates}
        onClose={() => setIsCleaningDuplicates(false)}
        onConfirm={handleCleanDuplicates}
        title={`Limpar ${duplicatesToDelete.length} duplicatas?`}
        message="As mídias duplicadas serão removidas do cofre."
        confirmText="Limpar"
        cancelText="Cancelar"
      />
    </>
  );
}
