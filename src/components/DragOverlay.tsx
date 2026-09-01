import React from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DragOverlayProps {
  isDraggingGlobal: boolean;
}

export default function DragOverlay({ isDraggingGlobal }: DragOverlayProps) {
  return (
    <AnimatePresence>
      {isDraggingGlobal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-white/10 backdrop-blur-md flex items-center justify-center pointer-events-none"
        >
          <div className="bg-white text-black px-8 py-6 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 border border-white/20">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center">
              <Plus size={32} strokeWidth={2.5} />
            </div>
            <p className="text-xl font-bold tracking-tight">
              Solte para Adicionar Fotos
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
