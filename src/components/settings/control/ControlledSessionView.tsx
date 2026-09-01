import React from 'react';
import { motion } from 'motion/react';
import { Radio, Lock, ShieldAlert, X, Check } from 'lucide-react';
import { DeviceState } from './types';

interface ControlledSessionViewProps {
  connState: string;
  myCode: string;
  pendingRequest: { id: string; code: string; email?: string; uid?: string } | null;
  remoteId: string;
  localState: DeviceState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraError: string;
  onCancel: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export function ControlledSessionView({
  connState,
  myCode,
  pendingRequest,
  remoteId,
  localState,
  videoRef,
  cameraError,
  onCancel,
  onAccept,
  onReject,
}: ControlledSessionViewProps) {
  if (connState === 'waiting') {
    return (
      <div className="text-center py-6 space-y-6 flex flex-col items-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white/5 animate-ping scale-125" />
          <div className="w-16 h-16 bg-zinc-900 border border-white/15 rounded-full flex items-center justify-center">
            <Radio size={24} className="text-white animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-1">
          <h4 className="text-base font-bold">Aguardando Conexão</h4>
          <p className="text-xs text-zinc-400">Informe este código no outro aparelho:</p>
        </div>

        <div className="bg-zinc-950 px-8 py-4 rounded-2xl border border-white/10 font-mono text-3xl font-black tracking-[0.2em] text-white shadow-inner">
          {myCode}
        </div>

        <button
          onClick={onCancel}
          className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold border border-white/5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (connState === 'requesting' && pendingRequest) {
    return (
      <div className="p-5 bg-zinc-950 border border-white/10 rounded-2xl space-y-6 text-center flex flex-col items-center">
        <div className="p-4 bg-yellow-500/10 rounded-full text-yellow-400">
          <ShieldAlert size={32} />
        </div>
        <div className="space-y-2">
          <h4 className="font-bold text-white text-lg">Solicitação de Acesso</h4>
          <p className="text-xs text-zinc-400">
            A conta <span className="text-zinc-200">{pendingRequest.email || pendingRequest.id}</span> deseja controlar este dispositivo.
          </p>
        </div>

        <div className="flex w-full gap-3 pt-2">
          <button
            onClick={onReject}
            className="flex-1 py-3 bg-zinc-900 hover:bg-red-950/30 text-red-400 font-bold text-sm rounded-xl border border-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} />
            Negar
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Permitir
          </button>
        </div>
      </div>
    );
  }

  if (connState === 'connected') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 rounded-2xl border border-white/5 gap-3 text-center">
          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Sessão Ativa</p>
            <p className="text-sm font-mono text-zinc-200 mt-1">{remoteId}</p>
          </div>
        </div>

        {localState.isShuttingDown && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <Lock size={48} className="text-red-500 mb-6" />
            <p className="text-lg font-mono text-zinc-300">Aparelho Bloqueado</p>
            <p className="text-xs text-zinc-500 mt-2">Pelo administrador remoto</p>
          </motion.div>
        )}

        {localState.pinAppEnabled && (
          <div className="p-5 bg-zinc-950 rounded-2xl border border-red-900/30 space-y-4 text-center flex flex-col items-center">
            <div className="p-3 bg-red-950/40 text-red-400 rounded-full">
              <Lock size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Acesso Restrito</h4>
              <p className="text-[10px] text-zinc-500 mt-1">Aparelho bloqueado no aplicativo abaixo</p>
            </div>
            <div className="w-full p-3 bg-zinc-900 rounded-xl border border-white/5">
              <p className="text-sm font-black text-white uppercase tracking-wider font-mono">{localState.pinnedAppName}</p>
            </div>
          </div>
        )}

        {localState.isCameraActive && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Câmera Ativa</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/15 rounded-md">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">LIVE</span>
              </div>
            </div>
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
              {cameraError ? (
                <p className="text-xs text-zinc-500">{cameraError}</p>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
