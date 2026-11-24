import React from 'react';
import { DecryptedImage } from '../../../types';

export interface GalleryItemProps {
  key?: string;
  img: DecryptedImage;
  index: number;
  isSelectionMode: boolean;
  setIsSelectionMode?: (mode: boolean) => void;
  selectedForDeletion: string[];
  setSelectedForDeletion?: (val: string[] | ((prev: string[]) => string[])) => void;
  securityImageId: string | null;
  isExtraUnlocked: boolean;
  extraPassword: string | null;
  hideProtectButton?: boolean;
  handleImageClick: (img: DecryptedImage, index: number, e: React.MouseEvent) => Promise<void> | void;
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean, priority?: number) => Promise<void>;
  setImageToDelete: (id: string | null) => void;
  setImageToProtect?: (id: string | null) => void;
}

const selectedSetCache = new WeakMap<string[], Set<string>>();
export function isIdSelected(list: string[], id: string): boolean {
  if (list.length < 16) return list.includes(id);
  let set = selectedSetCache.get(list);
  if (!set) { set = new Set(list); selectedSetCache.set(list, set); }
  return set.has(id);
}

export function areGalleryItemPropsEqual(prevProps: GalleryItemProps, nextProps: GalleryItemProps): boolean {
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.isSelectionMode !== nextProps.isSelectionMode) return false;
  if (prevProps.hideProtectButton !== nextProps.hideProtectButton) return false;
  if (prevProps.securityImageId !== nextProps.securityImageId) return false;
  if (prevProps.isExtraUnlocked !== nextProps.isExtraUnlocked) return false;
  if (prevProps.extraPassword !== nextProps.extraPassword) return false;

  const wasSecurityImage = prevProps.securityImageId === prevProps.img.id;
  const isSecurityImage = nextProps.securityImageId === nextProps.img.id;
  if (wasSecurityImage !== isSecurityImage) return false;

  const wasSelected = isIdSelected(prevProps.selectedForDeletion, prevProps.img.id);
  const isSelected = isIdSelected(nextProps.selectedForDeletion, nextProps.img.id);
  if (wasSelected !== isSelected) return false;

  if (prevProps.img.id !== nextProps.img.id) return false;
  if (prevProps.img.url !== nextProps.img.url) return false;
  if (prevProps.img.failed !== nextProps.img.failed) return false;
  if (prevProps.img.isMissing !== nextProps.img.isMissing) return false;
  if (prevProps.img.isVideo !== nextProps.img.isVideo) return false;
  if (prevProps.img.noThumbnail !== nextProps.img.noThumbnail) return false;

  return true;
}
