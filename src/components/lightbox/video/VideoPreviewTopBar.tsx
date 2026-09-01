import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, RotateCw } from 'lucide-react';
import type { LightboxVideoPlayerProps } from '../LightboxVideoPlayer';
import { VideoActions } from './useVideoActions';

interface Props {
  props: LightboxVideoPlayerProps;
  actions: VideoActions;
}

export function VideoPreviewTopBar({ props, actions }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="w-full flex items-center justify-between px-4 pt-4 sm:pt-6 sm:px-6 pointer-events-auto bg-gradient-to-b from-black/80 to-transparent pb-4"
    >
      <button
        id="video-preview-btn-back"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          props.onClose();
        }}
        className="p-2.5 text-white/90 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
        title="Voltar"
      >
        <ChevronLeft size={28} className="stroke-[2.5]" />
      </button>
      <button
        id="video-preview-btn-rotate"
        type="button"
        onClick={actions.handleRotate}
        className="p-2.5 text-white/90 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
        title="Girar orientação"
      >
        <RotateCw size={22} className="stroke-[2.2]" />
      </button>
    </motion.div>
  );
}
