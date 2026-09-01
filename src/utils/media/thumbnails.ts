export async function generateImageThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      const maxDim = 300;
      let w = img.width;
      let h = img.height;

      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve('');
    };
  });
}

export async function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const url = URL.createObjectURL(file);
    video.src = url;

    const timeout = setTimeout(() => {
      cleanup();
      resolve('');
    }, 4000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.pause();
      URL.revokeObjectURL(url);
    };

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, video.duration || 0);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve('');
          return;
        }

        const maxDim = 300;
        let w = video.videoWidth || 300;
        let h = video.videoHeight || 300;
        
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        resolve('');
      }
    };
    
    video.onerror = () => {
      cleanup();
      resolve('');
    };
  });
}
