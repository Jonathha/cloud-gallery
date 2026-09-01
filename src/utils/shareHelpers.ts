import React from 'react';
import { decryptData } from './crypto';

export function base64ToBlobUrl(base64Str: string, blobUrlRef: React.MutableRefObject<string | null>): string {
  try {
    const parts = base64Str.split(';base64,');
    const contentType = parts.length > 1 ? parts[0].split(':')[1] : 'image/png';
    const base64Data = parts.length > 1 ? parts[1] : parts[0];
    const binaryStr = window.atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: contentType });
    const url = URL.createObjectURL(blob);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    blobUrlRef.current = url;
    return url;
  } catch (e) {
    console.error('Error creating Blob URL:', e);
    return base64Str;
  }
}

export async function processDecryptedChunks(
  snaps: any[],
  importedKey: CryptoKey,
  contentType: string,
  blobUrlRef: React.MutableRefObject<string | null>
): Promise<string> {
  const decryptPromises = snaps.map(async (docSnap, i) => {
    const chunkData = docSnap.data();
    const decBase64 = await decryptData(chunkData.ciphertext, chunkData.iv, importedKey);
    
    const parts = decBase64.split(',');
    const base64Str = parts.length > 1 ? parts[1] : parts[0];
    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let k = 0; k < binary.length; k++) {
      bytes[k] = binary.charCodeAt(k);
    }
    return { index: chunkData.index !== undefined ? chunkData.index : i, bytes };
  });

  const decryptedChunks = await Promise.all(decryptPromises);
  decryptedChunks.sort((a, b) => a.index - b.index);
  const chunkBuffers = decryptedChunks.map(c => c.bytes);

  const totalLength = chunkBuffers.reduce((sum, val) => sum + val.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of chunkBuffers) {
    merged.set(buf, offset);
    offset += buf.length;
  }

  const finalBlob = new Blob([merged], { type: contentType || 'video/mp4' });
  const finalUrl = URL.createObjectURL(finalBlob);
  if (blobUrlRef.current) {
    URL.revokeObjectURL(blobUrlRef.current);
  }
  blobUrlRef.current = finalUrl;
  return finalUrl;
}
