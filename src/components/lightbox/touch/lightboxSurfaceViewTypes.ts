import React from 'react';
import { LightboxTouchRefs, LightboxTouchSurfaceProps } from './lightboxTouchSurfaceTypes';

export interface LightboxSurfaceViewProps {
  props: LightboxTouchSurfaceProps;
  refs: LightboxTouchRefs;
  containerWidth: number;
  currentIndex: number;
  isCurrentVideo: boolean;
  isPlaybackActive: boolean;
  setIsPlaybackActive: (active: boolean) => void;
  handleTrackPointerDown: (e: React.PointerEvent) => void;
  handleDragStart: () => void;
  handleDragEnd: (event: any, info: any) => void;
  capture: {
    handleControlsClick: (e: React.MouseEvent) => void;
    handlePointerDownCapture: (e: React.PointerEvent) => void;
    handleTouchStartCapture: (e: React.TouchEvent) => void;
    handleTouchMoveCapture: (e: React.TouchEvent) => void;
  };
  swipeClose: {
    handleTouchStart: (e: React.TouchEvent) => void;
    handleTouchEnd: (e: React.TouchEvent) => void;
  };
}
