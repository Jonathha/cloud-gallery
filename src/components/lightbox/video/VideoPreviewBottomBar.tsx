import React from 'react';
import { motion } from 'motion/react';
import { Play, Volume2, VolumeX, Info, Share2, Trash2 } from 'lucide-react';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';
import { LightboxVideoState } from './useLightboxVideoState';
import { VideoActions } from './useVideoActions';

interface Props {
  props: LightboxVideoPlayerProps;
  state: LightboxVideoState;
  actions: VideoActions;
}

export function VideoPreviewBottomBar({ props, state, actions }: Props) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full px-4 sm:px-6 flex items-center justify-center pb-5 sm:pb-6 pointer-events-auto relative"
      >
        <button
          id="video-preview-btn-play"
          type="button"
          onClick={actions.handleStartPlay}
          className="bg-black/80 hover:bg-black/95 active:scale-95 border border-white/20 backdrop-blur-lg text-white font-medium px-6 py-2.5 rounded-full flex items-center gap-2.5 text-sm shadow-2xl transition-all cursor-pointer"
        >
          <Play size={16} className="fill-white text-white" />
          <span>Reproduzir vídeo</span>
        </button>

        <button
          id="video-preview-btn-mute"
          type="button"
          onClick={actions.toggleMute}
          className="absolute right-4 sm:right-6 p-2 bg-black/60 hover:bg-black/80 active:scale-95 border border-white/10 backdrop-blur-md rounded-full text-white shadow-lg transition-all cursor-pointer"
          title={state.isMuted ? 'Desmutar' : 'Mutar'}
        >
          {state.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full bg-black/90 border-t border-white/10 px-8 py-4 flex items-center justify-around backdrop-blur-md pointer-events-auto"
      >
        <button
          id="video-btn-info"
          type="button"
          onClick={(e) => { e.stopPropagation(); props.onOpenDetails?.(); }}
          className="p-2.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
          title="Detalhes do arquivo"
        >
          <Info size={22} className="stroke-[1.8]" />
        </button>

        <button
          id="video-btn-share"
          type="button"
          onClick={(e) => { e.stopPropagation(); props.setIsShareOpen(true); }}
          className="p-2.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
          title="Compartilhar vídeo"
        >
          <Share2 size={22} className="stroke-[1.8]" />
        </button>

        {props.onDelete && (
          <button
            id="video-btn-delete"
            type="button"
            onClick={(e) => { e.stopPropagation(); props.onDelete!(); }}
            className="p-2.5 text-white/80 hover:text-red-400 rounded-full hover:bg-red-500/10 transition-all active:scale-90 cursor-pointer"
            title="Excluir vídeo"
          >
            <Trash2 size={22} className="stroke-[1.8]" />
          </button>
        )}
      </motion.div>
    </>
  );
}
