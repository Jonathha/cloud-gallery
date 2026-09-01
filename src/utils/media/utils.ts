export async function compressAudio(blob: Blob): Promise<Blob> {
  try {
    if (blob.size < 50000) return blob;
    return new Blob([blob], { type: 'audio/webm' });
  } catch (err) {
    return blob;
  }
}

export function sliceFileIntoChunks(file: File, chunkSize: number = 400000): Blob[] {
  const chunks: Blob[] = [];
  let currentByte = 0;
  while (currentByte < file.size) {
    const chunk = file.slice(currentByte, currentByte + chunkSize);
    chunks.push(chunk);
    currentByte += chunkSize;
  }
  return chunks;
}

export async function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => reject(err);
  });
}
