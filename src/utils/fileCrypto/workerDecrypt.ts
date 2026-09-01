import { DecryptWorkerOptions } from './types';

let decryptionWorker: Worker | null = null;

const workerScript = `
  async function base64ToBytes(base64) {
    try {
      const res = await fetch("data:application/octet-stream;base64," + base64);
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
    } catch (e) {}
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    return bytes;
  }

  self.onmessage = async function(e) {
    const { id, buffer, fileSalt, fileKeyStr, iv, ciphertextBase64, ciphertextBytes: inputBytes, isEnvelope, rawMasterKey } = e.data;
    try {
      let ciphertextBytes;
      let metadata = null;

      if (buffer) {
        const view = new DataView(buffer);
        const magic = (view.getUint8(0) << 24) | (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);
        if (magic !== 0x454e4331 && magic !== 0x454e4332) throw new Error("Formato de arquivo .enc inválido");
        const metaLen = view.getUint32(4, false);
        metadata = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, metaLen)));
        const thumbOffset = (magic === 0x454e4332 && metadata.thumbSize) ? metadata.thumbSize : 0;
        ciphertextBytes = new Uint8Array(buffer, 8 + metaLen + thumbOffset);
      } else if (inputBytes) {
        ciphertextBytes = new Uint8Array(inputBytes);
      } else if (ciphertextBase64) {
        ciphertextBytes = await base64ToBytes(ciphertextBase64);
      } else {
        throw new Error("Nenhum dado fornecido para descriptografar");
      }

      let derivedCryptoKey;
      if (isEnvelope) {
        if (fileSalt && fileSalt.startsWith("v2_")) {
          const hashBuffer = await self.crypto.subtle.digest('SHA-256', new TextEncoder().encode(fileKeyStr));
          derivedCryptoKey = await self.crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        } else {
          const decodedSalt = atob(fileSalt);
          const saltBytes = Uint8Array.from(decodedSalt, c => c.charCodeAt(0));
          const keyMaterial = await self.crypto.subtle.importKey('raw', new TextEncoder().encode(fileKeyStr), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
          derivedCryptoKey = await self.crypto.subtle.deriveKey({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        }
      } else {
        derivedCryptoKey = await self.crypto.subtle.importKey('raw', await base64ToBytes(rawMasterKey), { name: 'AES-GCM' }, false, ['decrypt']);
      }

      const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
      const decryptedBuffer = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, derivedCryptoKey, ciphertextBytes);
      self.postMessage({ success: true, id, decryptedBuffer, metadata }, [decryptedBuffer]);
    } catch (err) {
      self.postMessage({ success: false, id, error: err.message || err.toString() });
    }
  };
`;

export function getDecryptionWorker(): Worker {
  if (typeof window === 'undefined') {
    throw new Error('Web Worker can only be initialized on the client side');
  }
  if (!decryptionWorker) {
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    decryptionWorker = new Worker(URL.createObjectURL(blob));
  }
  return decryptionWorker;
}

export function decryptVideoWithWorker(options: DecryptWorkerOptions): Promise<{ decryptedBuffer: ArrayBuffer; metadata: any | null }> {
  return new Promise((resolve, reject) => {
    const worker = getDecryptionWorker();
    const messageId = Math.random().toString(36).slice(2);
    
    const handleMessage = (e: MessageEvent) => {
      if (e.data.id === messageId) {
        worker.removeEventListener('message', handleMessage);
        if (e.data.success) {
          resolve({
            decryptedBuffer: e.data.decryptedBuffer,
            metadata: e.data.metadata
          });
        } else {
          reject(new Error(e.data.error || "Erro na descriptografia do Worker"));
        }
      }
    };
    
    worker.addEventListener('message', handleMessage);
    
    const transferables: Transferable[] = [];
    if (options.buffer) {
      transferables.push(options.buffer);
    }
    if (options.ciphertextBytes) {
      if (options.ciphertextBytes instanceof ArrayBuffer) {
        transferables.push(options.ciphertextBytes);
      } else if (options.ciphertextBytes instanceof Uint8Array) {
        transferables.push(options.ciphertextBytes.buffer);
      }
    }
    
    worker.postMessage({ id: messageId, ...options }, transferables);
  });
}
