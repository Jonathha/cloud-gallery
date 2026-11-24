import { useState } from 'react';

export function useSelectedMediaState() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageIsVideo, setSelectedImageIsVideo] = useState(false);
  const [downloadingFull, setDownloadingFull] = useState(false);
  const [fullDownloadProgress, setFullDownloadProgress] = useState('');

  return {
    selectedImage, setSelectedImage,
    selectedImageId, setSelectedImageId,
    selectedImageIsVideo, setSelectedImageIsVideo,
    downloadingFull, setDownloadingFull,
    fullDownloadProgress, setFullDownloadProgress
  };
}
