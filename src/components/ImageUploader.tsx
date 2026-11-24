import React from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import Toast from './Toast';
import { useImageUploaderLogic } from '../hooks/useImageUploaderLogic';

// Componente leve exclusivo para seleção de arquivos no modal: ZERO overhead de bibliotecas pesadas de upload
export function ImagePickerDropzone({ 
  onFilesSelected 
}: { 
  onFilesSelected: (files: File[]) => void 
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    onDropRejected: (fileRejections) => {
      const recoveredFiles: File[] = [];
      for (const rej of fileRejections) {
        const file = rej.file;
        if (file && file.size > 0 && !file.name.match(/\.(exe|zip|tar|rar|pdf|docx|txt|html|apk)$/i)) {
          recoveredFiles.push(file);
        }
      }
      if (recoveredFiles.length > 0) {
        onFilesSelected(recoveredFiles);
      }
    },
    accept: {
      'image/*': [],
      'video/*': []
    }
  });

  return (
    <div className="flex flex-col h-full">
      <div 
        {...getRootProps()} 
        className={`border border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-colors duration-200 flex-1 flex flex-col justify-center min-h-[220px] sm:min-h-[260px] relative overflow-hidden ${
          isDragActive 
            ? 'border-white/40 bg-white/[0.08]' 
            : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
      >
        {isDragActive && (
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
        )}
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-5 relative z-10">
          <div className="relative">
            <div 
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
                isDragActive 
                  ? 'bg-white/15 text-white' 
                  : 'bg-white/[0.06] border border-white/10 text-white/80'
              }`}
            >
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
          </div>
          
          <div className="space-y-1.5 text-center">
            <p className="text-base sm:text-lg font-medium text-white tracking-tight">
              Adicionar Fotos ou Vídeos
            </p>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
              Selecione fotos ou vídeos do seu aparelho para salvar no cofre
            </p>
          </div>
          
          <div className="pt-2 flex items-center gap-2 justify-center">
            <span className="px-5 py-2.5 sm:px-6 sm:py-2.5 bg-white hover:bg-zinc-200 text-black text-xs sm:text-sm font-semibold rounded-full transition-colors inline-block shadow-md">
              Escolher do Aparelho
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Executor de upload em segundo plano: processa criptografia e sincronização
function ImageUploadExecutor({ 
  onComplete, 
  onUploadingStateChange,
  initialFiles = []
}: { 
  onComplete?: () => void,
  onUploadingStateChange?: (isUploading: boolean) => void,
  initialFiles?: File[]
}) {
  const u = useImageUploaderLogic(onComplete, onUploadingStateChange, initialFiles);

  return (
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
  );
}

export default function ImageUploader(props: { 
  onComplete?: () => void,
  onUploadingStateChange?: (isUploading: boolean) => void,
  initialFiles?: File[],
  onFilesSelected?: (files: File[]) => void
}) {
  if (props.onFilesSelected) {
    return <ImagePickerDropzone onFilesSelected={props.onFilesSelected} />;
  }

  return (
    <ImageUploadExecutor
      onComplete={props.onComplete}
      onUploadingStateChange={props.onUploadingStateChange}
      initialFiles={props.initialFiles}
    />
  );
}
