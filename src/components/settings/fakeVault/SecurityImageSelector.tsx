import React from 'react';
import { Lock, Check, Loader2 } from 'lucide-react';

interface DecryptedImage {
  id: string;
  url: string;
  failed?: boolean;
  createdAt: number;
}

interface SecurityImageSelectorProps {
  securityImageId: string | null;
  loadingProtected: boolean;
  protectedImgUrl: string | null;
  images: DecryptedImage[];
  setSecurityImage: (id: string | null) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  extraPassword: string | null;
  setPendingImageId: (id: string | null) => void;
  setShowCreatePrompt: (show: boolean) => void;
  setPromptPassword: (val: string) => void;
  setPromptConfirmPassword: (val: string) => void;
}

export function SecurityImageSelector({
  securityImageId,
  loadingProtected,
  protectedImgUrl,
  images,
  setSecurityImage,
  showToast,
  extraPassword,
  setPendingImageId,
  setShowCreatePrompt,
  setPromptPassword,
  setPromptConfirmPassword,
}: SecurityImageSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-zinc-400">2. Selecione a Imagem para Proteger</label>
      
      {securityImageId && (
        <div className="p-4 bg-zinc-900/50 border border-white/10 rounded-2xl flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-white overflow-hidden shrink-0">
              {loadingProtected ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : protectedImgUrl ? (
                <img src={protectedImgUrl} alt="Protegida" className="w-full h-full object-cover" />
              ) : images.find(img => img.id === securityImageId) ? (
                <img src={images.find(img => img.id === securityImageId)?.url} alt="Protegida" className="w-full h-full object-cover" />
              ) : (
                <Lock size={18} />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">Imagem Protegida Ativa</p>
              <p className="text-xs text-zinc-500">Esta imagem exige a senha de segurança para ser vista.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await setSecurityImage(null);
                showToast('Proteção removida da imagem');
              } catch (error) {
                showToast('Erro ao remover proteção', 'error');
              }
            }}
            className="text-xs text-red-400 hover:text-red-300 font-medium shrink-0"
          >
            Remover
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
        {images.length > 0 ? (
          images.map((img) => (
            <div 
              key={img.id}
              onClick={async () => {
                if (!extraPassword) {
                  setPendingImageId(img.id);
                  setPromptPassword('');
                  setPromptConfirmPassword('');
                  setShowCreatePrompt(true);
                  return;
                }
                try {
                  await setSecurityImage(img.id);
                  showToast('Imagem protegida com sucesso!');
                } catch (error) {
                  showToast('Erro ao proteger imagem', 'error');
                }
              }}
              className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${securityImageId === img.id ? 'border-white' : 'border-transparent hover:border-white/30'}`}
            >
              <img src={img.url} alt="Gallery item" className="w-full h-full object-cover" />
              {securityImageId === img.id && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Check className="text-white" size={24} />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-3 p-4 bg-zinc-900/30 border border-dashed border-white/10 rounded-2xl text-center">
            <p className="text-sm text-zinc-500">
              Nenhuma imagem na Cloud Gallery. Adicione fotos primeiro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
