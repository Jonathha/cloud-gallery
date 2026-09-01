import React, { useState } from 'react';
import { X, Share2, Copy, Trash2, Check, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useShareLogic } from '../hooks/useShareLogic';
import ShareConfigForm from './ShareConfigForm';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageId: string;
  decryptedImageUrl: string;
}

export default function ShareModal({ isOpen, onClose, imageId, decryptedImageUrl }: ShareModalProps) {
  const s = useShareLogic(isOpen, imageId, decryptedImageUrl, onClose);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Share2 className="text-zinc-400" size={20} />
            <h3 className="font-semibold text-lg">Compartilhar Imagem</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {s.checking ? (
          <div className="p-10 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-white animate-spin" strokeWidth={1.5} />
            <p className="text-sm text-zinc-400">Verificando links...</p>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-5 overflow-y-auto">
            {s.error && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg flex gap-2 items-start text-red-400 text-xs text-left">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{s.error}</span>
              </div>
            )}

            {/* List existing active share if any */}
            {s.existingShares.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-xs font-semibold text-zinc-300 text-left flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-green-400" />
                  Link ativo para esta imagem
                </div>

                <div className="flex flex-col gap-3">
                  {s.existingShares.map((share: any, idx: number) => {
                    const linkUrl = share.finalUrl || `${window.location.origin}/?share=${share.id}`;
                    const isDeleting = s.deletingId === share.id;

                    return (
                      <div key={share.id || idx} className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={linkUrl}
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 w-full select-all font-mono"
                          />
                          <button
                            onClick={() => handleCopyLink(linkUrl, share.id)}
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all shrink-0 active:scale-95"
                            title="Copiar Link"
                          >
                            {copiedId === share.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                          </button>
                        </div>

                        {share.options?.oneTimeView && (
                          <div className="text-[11px] text-amber-500 bg-amber-500/10 p-2 rounded border border-amber-950 text-left">
                            ⚠️ Visualização única (1 min).
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-zinc-500 text-left pt-1 border-t border-zinc-800/60">
                          <span>
                            {share.options?.requirePassword ? '🔒 Com Senha' : '🔓 Sem Senha'} •{' '}
                            {share.options?.allowDownload ? 'Download sim' : 'Download não'} •{' '}
                            {share.options?.expiresAt ? 'Expirável (1h)' : 'Permanente'}
                          </span>

                          <button
                            onClick={() => s.handleDeleteShare(share.id)}
                            disabled={isDeleting}
                            className="flex items-center gap-1 text-red-400 hover:text-red-300 hover:bg-red-950/50 px-2 py-1 rounded transition-colors text-[11px] disabled:opacity-50"
                            title="Excluir este link"
                          >
                            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Creation form when no active share exists */}
            {s.existingShares.length === 0 && (
              <div className="flex flex-col gap-3">
                <ShareConfigForm
                  linkDuration={s.linkDuration}
                  setLinkDuration={s.setLinkDuration}
                  requirePassword={s.requirePassword}
                  setRequirePassword={s.setRequirePassword}
                  password={s.password}
                  setPassword={s.setPassword}
                  allowDownload={s.allowDownload}
                  setAllowDownload={s.setAllowDownload}
                  oneTimeView={s.oneTimeView}
                  setOneTimeView={s.setOneTimeView}
                  loading={s.loading}
                  onClose={onClose}
                  onGenerate={s.handleGenerateShare}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
