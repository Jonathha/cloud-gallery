import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ImageUploader from "../ImageUploader";

interface GalleryUploaderModalProps {
  isUploaderOpen: boolean;
  setIsUploaderOpen: (open: boolean) => void;
  isUploading: boolean;
  setDroppedFiles: (files: File[]) => void;
  droppedFiles: File[];
  setIsUploading: (uploading: boolean) => void;
  loadImages: () => void;
}

export default function GalleryUploaderModal({
  isUploaderOpen,
  setIsUploaderOpen,
  isUploading,
  setDroppedFiles,
  droppedFiles,
  setIsUploading,
  loadImages,
}: GalleryUploaderModalProps) {
  return (
    <>
      <AnimatePresence>
        {isUploaderOpen && (
          <motion.div
            key="uploader-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-uploader-modal="true"
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
          >
            <div
              onClick={() => !isUploading && setIsUploaderOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 350,
              }}
              style={{ willChange: "transform, opacity" }}
              className="relative w-full max-w-lg bg-[#0a0a0a] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[85dvh] sm:max-h-[90vh] ring-1 ring-white/5"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 md:hidden" />
              <div className="p-3.5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Adicionar Fotos
                </h2>
                <button
                  onClick={() => setIsUploaderOpen(false)}
                  className="p-1.5 sm:p-2 rounded-full transition-colors hover:bg-white/5 text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 flex flex-col">
                <ImageUploader
                  onFilesSelected={(files) => {
                    setIsUploaderOpen(false);
                    setDroppedFiles(files);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden" aria-hidden="true" style={{ display: "none" }}>
        <ImageUploader
          onComplete={() => {
            setDroppedFiles([]);
            loadImages();
          }}
          onUploadingStateChange={setIsUploading}
          initialFiles={droppedFiles}
        />
      </div>
    </>
  );
}
