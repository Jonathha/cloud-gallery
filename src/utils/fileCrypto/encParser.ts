import { bytesToBase64 } from '../crypto';
import { UnpackResult, UnpackRawResult } from './types';

export function parseEncHeader(buffer: ArrayBuffer): {
  magic: number;
  metaLen: number;
  metadata: any;
  thumbSize: number;
} {
  if (!buffer || buffer.byteLength < 8) {
    throw new Error("Formato de arquivo .enc inválido: tamanho insuficiente");
  }

  const view = new DataView(buffer);
  const magic = (view.getUint8(0) << 24) | (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);
  if (magic !== 0x454e4331 && magic !== 0x454e4332) {
    throw new Error("Formato de arquivo .enc inválido");
  }

  const metaLen = view.getUint32(4, false);
  if (buffer.byteLength < 8 + metaLen) {
    throw new Error("Formato de arquivo .enc inválido: metadados truncados");
  }

  const metaBytes = new Uint8Array(buffer, 8, metaLen);
  const decoder = new TextDecoder();
  const metadata = JSON.parse(decoder.decode(metaBytes));
  const thumbSize = magic === 0x454e4332 ? (metadata.thumbSize || 0) : 0;

  return { magic, metaLen, metadata, thumbSize };
}

export function unpackEncryptedFile(buffer: ArrayBuffer): UnpackResult {
  const { magic, metaLen, metadata, thumbSize } = parseEncHeader(buffer);
  
  let thumbnailCiphertextBase64 = "";
  if (magic === 0x454e4332 && thumbSize > 0) {
    const thumbBytes = new Uint8Array(buffer, 8 + metaLen, thumbSize);
    let binary = "";
    const len = thumbBytes.byteLength;
    const chunkSize = 65536;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = thumbBytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    thumbnailCiphertextBase64 = btoa(binary);
  }

  const ciphertextBytes = new Uint8Array(buffer, 8 + metaLen + thumbSize);
  let binary = "";
  const len = ciphertextBytes.byteLength;
  const chunkSize = 65536;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = ciphertextBytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  const ciphertextBase64 = btoa(binary);
  
  return { metadata, ciphertextBase64, thumbnailCiphertextBase64 };
}

export async function unpackEncryptedFileAsync(buffer: ArrayBuffer): Promise<UnpackResult> {
  const { magic, metaLen, metadata, thumbSize } = parseEncHeader(buffer);
  
  let thumbnailCiphertextBase64 = "";
  if (magic === 0x454e4332 && thumbSize > 0) {
    const thumbBytes = new Uint8Array(buffer, 8 + metaLen, thumbSize);
    thumbnailCiphertextBase64 = await bytesToBase64(thumbBytes);
  }

  const ciphertextBytes = new Uint8Array(buffer, 8 + metaLen + thumbSize);
  const ciphertextBase64 = await bytesToBase64(ciphertextBytes);
  
  return { metadata, ciphertextBase64, thumbnailCiphertextBase64 };
}

export function unpackEncryptedFileRaw(buffer: ArrayBuffer): UnpackRawResult {
  const { magic, metaLen, metadata, thumbSize } = parseEncHeader(buffer);
  
  let thumbBytes: Uint8Array | undefined = undefined;
  if (magic === 0x454e4332 && thumbSize > 0) {
    thumbBytes = new Uint8Array(buffer, 8 + metaLen, thumbSize);
  }

  const ciphertextBytes = new Uint8Array(buffer, 8 + metaLen + thumbSize);
  return { metadata, ciphertextBytes, thumbBytes };
}
