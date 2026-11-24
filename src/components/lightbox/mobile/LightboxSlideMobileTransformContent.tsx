import React from 'react';
import { TransformComponent } from 'react-zoom-pan-pinch';
import { DecryptedImage } from '../../../types';
import { LightboxSlideMobileMediaElement } from './LightboxSlideMobileMediaElement';

interface LightboxSlideMobileTransformContentProps {
  img: DecryptedImage;
  isCurrent: boolean;
  isZoomed: boolean;
  imageFit: 'contain' | 'cover';
  thumbnailUrl: string;
  activeOriginalUrl: string | null;
}

export function LightboxSlideMobileTransformContent(
  props: LightboxSlideMobileTransformContentProps
) {
  return (
    <TransformComponent
      wrapperClass="w-full h-full overflow-hidden"
      contentClass="w-full h-full flex items-center justify-center"
      wrapperStyle={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
      contentStyle={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <LightboxSlideMobileMediaElement {...props} />
    </TransformComponent>
  );
}
