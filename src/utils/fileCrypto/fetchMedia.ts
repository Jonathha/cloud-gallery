import { getApiUrl } from '../apiUrl';
import { unpackEncryptedFileAsync } from './encParser';

export async function fetchAndUnpackImage(id: string, token?: string): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(getApiUrl(`/api/storage/image/${id}`), { headers });
  if (!res.ok) {
    throw new Error(`Erro ao buscar mídia: ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength >= 8) {
    const view = new DataView(buffer);
    if (buffer.byteLength >= 4) {
      const magic = (view.getUint8(0) << 24) | (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);
      if (magic === 0x454e4331 || magic === 0x454e4332) {
        const { metadata, ciphertextBase64, thumbnailCiphertextBase64 } = await unpackEncryptedFileAsync(buffer);
        return {
          ...metadata,
          ciphertext: ciphertextBase64,
          thumbnailCiphertext: thumbnailCiphertextBase64 || metadata.thumbnailCiphertext || ""
        };
      }
    }
  }
  
  const text = new TextDecoder().decode(buffer);
  const data = JSON.parse(text);
  if (data.success && data.image) {
    return data.image;
  }
  throw new Error(data.error || "Mídia não encontrada");
}

export async function fetchAndUnpackThumbnail(id: string, token?: string): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(getApiUrl(`/api/storage/thumbnail/${id}`), { headers });
  if (!res.ok) {
    throw new Error(`Erro ao buscar miniatura: ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength >= 8) {
    const view = new DataView(buffer);
    if (buffer.byteLength >= 4) {
      const magic = (view.getUint8(0) << 24) | (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);
      if (magic === 0x454e4331 || magic === 0x454e4332) {
        const { metadata, ciphertextBase64, thumbnailCiphertextBase64 } = await unpackEncryptedFileAsync(buffer);
        return {
          ...metadata,
          ciphertext: thumbnailCiphertextBase64 || ciphertextBase64
        };
      }
    }
  }
  throw new Error("Miniatura em formato inválido");
}

export async function fetchRawEncryptedFile(id: string, token?: string): Promise<ArrayBuffer> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(getApiUrl(`/api/storage/image/${id}`), { headers });
  if (!res.ok) {
    throw new Error(`Erro ao buscar mídia: ${res.status}`);
  }
  return res.arrayBuffer();
}
