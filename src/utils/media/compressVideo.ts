export async function compressVideo(file: File, onProgress?: (completedDecimal: number) => void): Promise<File> {
  return new Promise((resolve) => {
    if (file.size < 1.5 * 1024 * 1024) {
      if (onProgress) onProgress(1);
      resolve(file);
      return;
    }
    
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const url = URL.createObjectURL(file);
    video.src = url;
    
    const timeout = setTimeout(() => {
      cleanup();
      resolve(file);
    }, 8000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.pause();
      URL.revokeObjectURL(url);
    };

    video.onloadeddata = async () => {
      if (onProgress) onProgress(0.3);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(file);
          return;
        }

        const maxDim = 720;
        let w = video.videoWidth || 720;
        let h = video.videoHeight || 1280;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;

        if (typeof canvas.captureStream === 'function' && MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          const stream = canvas.captureStream(30);
          const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus', videoBitsPerSecond: 1000000 });
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            cleanup();
            if (onProgress) onProgress(1);
            if (chunks.length > 0) {
              const compressedBlob = new Blob(chunks, { type: 'video/webm' });
              if (compressedBlob.size < file.size) {
                const cleanedName = file.name.replace(/\.[^/.]+$/, "") + ".webm";
                resolve(new File([compressedBlob], cleanedName, { type: 'video/webm', lastModified: Date.now() }));
                return;
              }
            }
            resolve(file);
          };

          recorder.start();
          video.currentTime = 0;
          video.play();
          if (onProgress) onProgress(0.7);

          const draw = () => {
            if (video.ended || video.paused) {
              recorder.stop();
              return;
            }
            ctx.drawImage(video, 0, 0, w, h);
            requestAnimationFrame(draw);
          };
          video.onplay = () => {
            requestAnimationFrame(draw);
          };
        } else {
          cleanup();
          if (onProgress) onProgress(1);
          resolve(file);
        }
      } catch (err) {
        console.warn('Video compression fallback:', err);
        cleanup();
        if (onProgress) onProgress(1);
        resolve(file);
      }
    };
    
    video.onerror = () => {
      cleanup();
      if (onProgress) onProgress(1);
      resolve(file);
    };
  });
}
