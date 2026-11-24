import React from 'react';
import { DecryptedImage } from '../../../types';

export function handleRangeOrToggleSelect(
  img: DecryptedImage, index: number, e: React.MouseEvent,
  images: DecryptedImage[], lastSelectedIndex: number | null,
  setSelectedForDeletion: React.Dispatch<React.SetStateAction<string[]>>,
  setLastSelectedIndex: (idx: number) => void
) {
  if (e?.shiftKey && lastSelectedIndex !== null) {
    const start = Math.min(lastSelectedIndex, index);
    const end = Math.max(lastSelectedIndex, index);
    const rangeIds = images.slice(start, end + 1).map(i => i.id);
    setSelectedForDeletion(prev => Array.from(new Set([...prev, ...rangeIds])));
  } else {
    setSelectedForDeletion(prev => prev.includes(img.id) ? prev.filter(id => id !== img.id) : [...prev, img.id]);
  }
  setLastSelectedIndex(index);
}
