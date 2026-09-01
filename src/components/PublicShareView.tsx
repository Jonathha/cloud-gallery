import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import PublicPasswordPrompt from './PublicPasswordPrompt';
import PublicMediaFrame from './PublicMediaFrame';
import { usePublicShareLogic } from '../hooks/usePublicShareLogic';

export default function PublicShareView() {
  const s = usePublicShareLogic();

  if (s.loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-400 gap-4">
        <Loader2 className="w-10 h-10 text-white animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (s.error && !s.decryptedUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-sm w-full p-8 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-2xl flex flex-col items-center">
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight mb-2">
            Acesso Restrito / Expirado
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            {s.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <RefreshCw size={14} /> Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  // If requires password and not decrypted yet
  if (s.shareData?.options?.requirePassword && !s.decryptedUrl) {
    return (
      <PublicPasswordPrompt
        password={s.password}
        setPassword={s.setPassword}
        decrypting={s.decrypting}
        error={s.error}
        onSubmit={s.handlePasswordSubmit}
      />
    );
  }

  const oneTimeView = s.shareData?.options?.oneTimeView;
  const allowDownload = s.shareData?.options?.allowDownload && !oneTimeView;
  const isVideo = s.shareData?.contentType?.startsWith('video/');

  return (
    <PublicMediaFrame
      decryptedUrl={s.decryptedUrl}
      allowDownload={allowDownload}
      isVideo={isVideo || false}
      isDownloadingChunks={s.isDownloadingChunks}
      downloadProgress={s.downloadProgress}
    />
  );
}
