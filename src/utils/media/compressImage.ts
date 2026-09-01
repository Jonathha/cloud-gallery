import encode from '@jsquash/avif/encode';

export async function compressImage(file: File): Promise<File> {
  try {
    const cleanedName = file.name.replace(/\.[^/.]+$/, '') + '.avif';

    let imageData: ImageData | null = null;

    // Apply EXIF orientation and remove metadata by decoding through canvas
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file, {
          imageOrientation: 'from-image',
        });

        const canvas = document.createElement('canvas');

        canvas.width = bitmap.width;
        canvas.height = bitmap.height;

        const ctx = canvas.getContext('2d', {
          alpha: true,
          willReadFrequently: true,
        });

        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);

          imageData = ctx.getImageData(
            0,
            0,
            bitmap.width,
            bitmap.height
          );
        }

        bitmap.close();
      } catch (error) {
        console.warn(
          '[compressImage] createImageBitmap failed:',
          error
        );
      }
    }

    if (!imageData) {
      imageData = await getImageDataFromHTMLImage(file);
    }

    if (!imageData) {
      return file;
    }

    try {
      // Real AVIF Lossless encoding
      const avifBuffer = await encode(imageData, {
        lossless: true,
      });

      const blob = new Blob([avifBuffer], {
        type: 'image/avif',
      });

      return new File([blob], cleanedName, {
        type: 'image/avif',
        lastModified: Date.now(),
      });
    } catch (error) {
      console.error(
        '[compressImage] AVIF Lossless encoding failed:',
        error
      );

      // Do not generate lossy AVIF fallback and do NOT return original file to prevent EXIF leaks
      throw new Error('AVIF Lossless encoding failed');
    }
  } catch (error) {
    console.error(
      '[compressImage] Processing failed:',
      error
    );

    throw error;
  }
}


function getImageDataFromHTMLImage(
  file: File
): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);

    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', {
          alpha: true,
          willReadFrequently: true,
        });

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(
          0,
          0,
          width,
          height
        );

        URL.revokeObjectURL(objectUrl);

        resolve(imageData);
      } catch (error) {
        console.warn(
          '[compressImage] HTML image processing failed:',
          error
        );

        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}