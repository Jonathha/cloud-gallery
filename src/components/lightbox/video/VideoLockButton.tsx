import React from 'react';
import { Unlock } from 'lucide-react';
import { LightboxVideoState } from './useLightboxVideoState';
import { VideoActions } from './useVideoActions';

interface Props {
  state: LightboxVideoState;
  actions: VideoActions;
}

export function VideoLockButton({ state, actions }: Props) {
  if (!state.isLocked) return null;

  return (
    <div className="absolute top-6 right-6 z-50 pointer-events-auto">
      <button
        id="video-player-btn-unlock"
        type="button"
        onClick={actions.unlockControls}
        className="bg-black/80 border border-white/20 text-white p-3 rounded-full shadow-2xl backdrop-blur-md active:scale-90 transition-all flex items-center gap-2 text-xs cursor-pointer"
        title="Desbloquear tela"
      >
        <Unlock size={20} />
        <span>Desbloquear</span>
      </button>
    </div>
  );
}
