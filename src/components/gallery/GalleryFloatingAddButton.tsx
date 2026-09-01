import React from "react";
import { Plus } from "lucide-react";
import { isNativeApp, isMobileDevice } from "../../utils/isNativeApp";
import { motion, AnimatePresence } from "motion/react";

interface GalleryFloatingAddButtonProps {
  isSelectionMode: boolean;
  activeTab: string;
  setIsUploaderOpen: (open: boolean) => void;
}

export default function GalleryFloatingAddButton({
  isSelectionMode,
  activeTab,
  setIsUploaderOpen,
}: GalleryFloatingAddButtonProps) {
  const isApp = isNativeApp();
  const isMobile = isMobileDevice();
  return (
    <AnimatePresence>
      {!isSelectionMode && activeTab === "gallery" && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsUploaderOpen(true)}
          className="fixed right-5 lg:right-8 h-12 sm:h-13 px-4 sm:px-5 bg-white hover:bg-zinc-200 text-zinc-950 rounded-full shadow-xl flex items-center justify-center z-40 gap-2 font-medium transition-colors border border-white/20 active:scale-95 cursor-pointer"
          style={{ 
            bottom: isApp 
              ? "5.4rem" 
              : isMobile 
                ? "calc(5.6rem + env(safe-area-inset-bottom, 0px))" 
                : "calc(5.2rem + env(safe-area-inset-bottom, 0px))" 
          }}
        >
          <Plus size={20} strokeWidth={2.5} />
          <span className="text-xs sm:text-sm font-semibold tracking-tight pr-1">
            Adicionar Fotos
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
