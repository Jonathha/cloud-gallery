import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { UpdatePromptView } from './update/UpdatePromptView';
import { UpdateProgressView } from './update/UpdateProgressView';
import { UpdateSuccessView } from './update/UpdateSuccessView';

export default function AppUpdateCheckOverlay() {
  const {
    appConfig,
    setIsDismissed,
    updateState,
    progress,
    isApkInCache,
    apkSize,
    showOverlay,
    isSecurityMismatch,
    handleUpdate,
    handleRestart,
    startRealDownload
  } = useAppUpdate();

  if (!showOverlay) {
    return null;
  }

  const currentRequiredVersion = appConfig?.version || '2.0';
  const isRequired = appConfig?.required !== false || isSecurityMismatch;

  return (
    <div className="fixed inset-0 z-[999999] bg-zinc-950/90 backdrop-blur-md text-zinc-200 flex items-center justify-center p-4 overflow-y-auto font-sans select-none">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl relative space-y-4 flex flex-col my-auto">
        {/* Top Close Button (If optional) */}
        {!isRequired && (
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-3.5 right-3.5 p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer z-10"
            title="Fechar"
          >
            <X size={18} />
          </button>
        )}

        {/* Content & Primary Actions */}
        {updateState === 'idle' ? (
          <>
            <UpdatePromptView
              appConfig={appConfig}
              currentRequiredVersion={currentRequiredVersion}
              isApkInCache={isApkInCache}
              apkSize={apkSize}
              isSecurityMismatch={isSecurityMismatch}
              handleUpdate={handleUpdate}
            />

            {!isRequired && (
              <button
                onClick={() => setIsDismissed(true)}
                className="w-full py-2.5 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
              >
                IGNORAR ATUALIZAÇÃO
              </button>
            )}
          </>
        ) : updateState === 'downloading' ? (
          <>
            <UpdateProgressView progress={progress} />
            <button
              disabled
              className="bg-zinc-800 border border-zinc-700/60 text-zinc-400 font-semibold py-3 px-4 rounded-xl w-full flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
            >
              <Loader2 size={16} className="animate-spin text-white" />
              <span className="text-xs font-bold tracking-wider">BAIXANDO...</span>
            </button>
          </>
        ) : (
          <>
            <UpdateSuccessView />
            <div className="space-y-2 pt-1">
              <button
                onClick={handleRestart}
                className="bg-white hover:bg-zinc-200 text-black font-bold py-3.5 px-4 rounded-xl w-full flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span className="text-xs font-bold tracking-wider uppercase">CONCLUIR</span>
              </button>
              
              <button
                onClick={startRealDownload}
                className="text-zinc-400 hover:text-zinc-200 py-2 px-4 rounded-xl w-full font-medium text-[11px] flex items-center justify-center cursor-pointer transition-colors"
              >
                BAIXAR NOVAMENTE
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

