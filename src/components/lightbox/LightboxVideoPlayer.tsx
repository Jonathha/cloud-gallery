import React from 'react';
import { DecryptedImage } from '../../types';
import { useLightboxVideoState } from './video/useLightboxVideoState';
import { useVideoEffects } from './video/useVideoEffects';
import { useVideoActions } from './video/useVideoActions';
import { useVideoSeek } from './video/useVideoSeek';
import { useVideoKeyboard } from './video/useVideoKeyboard';
import { VideoElement } from './video/VideoElement';
import { VideoPreview } from './video/VideoPreview';
import { VideoPlayerControls } from './video/VideoPlayerControls';
import { VideoLockButton } from './video/VideoLockButton';

export interface LightboxVideoPlayerProps {
  img: DecryptedImage;
  src?: string;
  isCurrent: boolean;
  showControls: boolean;
  setShowControls: (show: boolean | ((prev: boolean) => boolean)) => void;
  imageFit?: 'contain' | 'cover';
  setImageFit?: (fit: 'contain' | 'cover') => void;
  onClose: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
  setIsShareOpen: (open: boolean) => void;
  downloadingFull?: boolean;
  setIsPlaybackActive?: (active: boolean) => void;
}

export default function LightboxVideoPlayer(props: LightboxVideoPlayerProps) {
  const state = useLightboxVideoState(props.imageFit);
  const effects = useVideoEffects(state, props);
  const actions = useVideoActions(state, props, effects);
  const seek = useVideoSeek(state, actions, effects);
  useVideoKeyboard(state, props, actions, effects);

  return (
    <div
      id="lightbox-video-container"
      className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden bg-black"
      onClick={seek.handleScreenClick}
    >
      <VideoElement props={props} state={state} />
      <VideoPreview props={props} state={state} actions={actions} />
      <VideoPlayerControls props={props} state={state} actions={actions} seek={seek} />
      <VideoLockButton state={state} actions={actions} />
    </div>
  );
}
