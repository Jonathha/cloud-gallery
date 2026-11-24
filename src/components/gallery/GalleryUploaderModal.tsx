import React from "react";
import { X } from "lucide-react";
import ImageUploader, { ImagePickerDropzone } from "../ImageUploader";
import UploadProgressIndicator from "./UploadProgressIndicator";

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
      <div
        data-uploader-modal="true"
        aria-hidden={!isUploaderOpen}
        className={`fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 transition-[visibility] duration-200 ${
          isUploaderOpen
            ? "visible pointer-events-auto"
            : "invisible pointer-events-none"
        }`}
      >
        <div
          onClick={() => !isUploading && setIsUploaderOpen(false)}
          className={`absolute inset-0 bg-black/80 transition-opacity duration-200 ease-out ${
            isUploaderOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`relative w-full max-w-md bg-[#0a0a0a] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[85dvh] sm:max-h-[90vh] ring-1 ring-white/5 transition-[opacity,transform] duration-200 ease-out ${
            isUploaderOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-3"
          }`}
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 md:hidden" />
          <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-white/10 flex items-center justify-between shrink-0">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Adicionar Mídias ao Cofre
            </h2>
            <button
              onClick={() => setIsUploaderOpen(false)}
              className="p-1.5 sm:p-2 rounded-full transition-colors hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col">
            <ImagePickerDropzone
              onFilesSelected={(files) => {
                setIsUploaderOpen(false);
                setDroppedFiles(files);
              }}
            />
          </div>
        </div>
      </div>

      <UploadProgressIndicator />

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
