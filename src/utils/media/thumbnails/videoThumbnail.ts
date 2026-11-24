import { calculateThumbDimensions } from "./dimensions";

export async function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    const timeout = setTimeout(() => { cleanup(); resolve(''); }, 4000);
    const cleanup = () => { clearTimeout(timeout); video.pause(); URL.revokeObjectURL(url); };
    video.onloadeddata = () => { video.currentTime = Math.min(0.5, video.duration || 0); };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { cleanup(); resolve(''); return; }
        const { width, height } = calculateThumbDimensions(video.videoWidth || 300, video.videoHeight || 300);
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        cleanup();
        resolve(dataUrl);
      } catch { cleanup(); resolve(''); }
    };
    video.onerror = () => { cleanup(); resolve(''); };
  });
}
