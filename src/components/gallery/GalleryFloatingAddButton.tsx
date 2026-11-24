import React from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GalleryFloatingAddButtonProps {
  isSelectionMode: boolean;
  activeTab: string;
  setIsUploaderOpen: (open: boolean) => void;
  selectedImageId?: string | null;
  // Galeria vazia: o estado vazio já tem o botão "Adicionar Primeira Foto".
  isEmpty?: boolean;
}

export default function GalleryFloatingAddButton({
  isSelectionMode,
  activeTab,
  setIsUploaderOpen,
  selectedImageId,
  isEmpty = false,
}: GalleryFloatingAddButtonProps) {
  return (
    <AnimatePresence>
      {!isSelectionMode && activeTab === "gallery" && !selectedImageId && !isEmpty && (
        <motion.button
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 12 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.15 }}
          onClick={() => setIsUploaderOpen(true)}
          id="gallery-floating-add-button"
          aria-label="Adicionar Fotos"
          className="fixed right-4 sm:right-6 lg:right-8 bottom-[calc(5.4rem+env(safe-area-inset-bottom,0px))] lg:bottom-8 w-12 sm:w-13 h-12 sm:h-13 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-950 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.55)] flex items-center justify-center z-40 font-semibold transition-colors border border-white/30 cursor-pointer select-none group"
        >
          <Plus size={22} strokeWidth={2.5} className="transition-transform group-hover:rotate-90 duration-300 shrink-0" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
