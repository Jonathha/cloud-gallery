import React from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Toast from './Toast';
import { useImageUploaderLogic } from '../hooks/useImageUploaderLogic';

export default function ImageUploader({ 
  onComplete, 
  onUploadingStateChange,
  initialFiles = [],
  onFilesSelected
}: { 
  onComplete?: () => void,
  onUploadingStateChange?: (isUploading: boolean) => void,
  initialFiles?: File[],
  onFilesSelected?: (files: File[]) => void
}) {
  const u = useImageUploaderLogic(onComplete, onUploadingStateChange, initialFiles);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: onFilesSelected || u.onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.heif'],
      'video/*': ['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm', '.quicktime']
    },
    disabled: u.uploading,
    inputProps: {
      'capture': 'environment'
    } as any
  } as any);

  return (
    <>
      <div className="space-y-4 sm:space-y-6 flex flex-col h-full">
        <div 
          {...getRootProps()} 
          className={`border border-dashed rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 text-center cursor-pointer transition-all duration-300 flex-1 flex flex-col justify-center min-h-[180px] sm:min-h-[280px] relative overflow-hidden ${
            isDragActive 
              ? 'border-white/40 bg-white/10 scale-[0.98]' 
              : 'border-white/10 hover:border-white/30 hover:bg-white/5'
          }`}
        >
          {isDragActive && (
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          )}
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-5 relative z-10">
            <div className="relative">
              {u.uploading ? (
                <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center relative">
                  <motion.div 
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 blur-xl bg-white/20 rounded-full" 
                  />
                  <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-spin relative z-10" strokeWidth={2} />
                </div>
              ) : (
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-b from-white/10 to-white/5 text-white rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center shadow-2xl border border-white/10"
                >
                  <UploadCloud className="w-7 h-7 sm:w-9 sm:h-9 opacity-80" strokeWidth={1.5} />
                </motion.div>
              )}
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <p className="text-base sm:text-xl font-semibold text-white tracking-tight">
                {u.uploading ? u.progressText : 'Adicionar Mídia'}
              </p>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-[240px] mx-auto leading-relaxed font-medium">
                {u.uploading 
                  ? 'Processando, compactando e criptografando end-to-end...' 
                  : 'Arraste imagens ou vídeos (até 1 GB) ou toque para selecionar.'}
              </p>
            </div>
            
            {!u.uploading && (
              <div className="pt-2 sm:pt-4 flex items-center gap-2 justify-center">
                <span className="px-5 py-2.5 sm:px-6 sm:py-3 bg-white hover:bg-zinc-200 text-black text-xs sm:text-sm font-bold tracking-wide rounded-full transition-colors inline-block shadow-lg">
                  Selecionar Arquivo
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
        
      <AnimatePresence>
        {u.toast && (
          <Toast 
            key="uploader-toast"
            message={u.toast.message} 
            type={u.toast.type} 
            onClose={() => u.setToast(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
