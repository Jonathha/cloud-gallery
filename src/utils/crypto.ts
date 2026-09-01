const ALGORITHM = 'AES-GCM';
const PBKDF2_ITERATIONS = 100000;
const SALT_SIZE = 16;
const IV_SIZE = 12;

export async function generateSalt(): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  return btoa(String.fromCharCode(...salt));
}

export async function deriveKey(password: string, saltBase64: string, extractable: boolean = false): Promise<CryptoKey> {
  const enc = new TextEncoder();
  let decodedSalt = '';
  try {
    decodedSalt = atob(saltBase64 || '');
  } catch (e) {
    decodedSalt = 'default_salt_val';
  }
  const salt = Uint8Array.from(decodedSalt, c => c.charCodeAt(0));
  
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    extractable, // non-extractable by default
    ['encrypt', 'decrypt']
  );
}

export async function bytesToBase64(bytes: Uint8Array): Promise<string> {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

export async function base64ToBytes(base64: string): Promise<Uint8Array> {
  try {
    const res = await fetch(`data:application/octet-stream;base64,${base64}`);
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      return new Uint8Array(arrayBuf);
    }
  } catch (e) {
    // Fall back to manual decoding if fetch is not supported/fails
  }

  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

export async function encryptData(data: string, key: CryptoKey): Promise<{ ciphertext: string, iv: string }> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_SIZE));
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv },
    key,
    enc.encode(data)
  );

  const ciphertext = await bytesToBase64(new Uint8Array(encrypted));
  const ivBase64 = await bytesToBase64(iv);

  return {
    ciphertext,
    iv: ivBase64
  };
}

export async function decryptData(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const ciphertext = await base64ToBytes(ciphertextBase64);
  const iv = await base64ToBytes(ivBase64);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder('utf-8', { fatal: true });
  try {
    return dec.decode(decrypted);
  } catch (e) {
    return await bytesToBase64(new Uint8Array(decrypted));
  }
}

export async function decryptDataRaw(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<ArrayBuffer> {
  const ciphertext = await base64ToBytes(ciphertextBase64);
  const iv = await base64ToBytes(ivBase64);

  return window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv },
    key,
    ciphertext
  );
}

export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return bytesToBase64(new Uint8Array(exported));
}

export async function importKeyFromBase64(base64: string): Promise<CryptoKey> {
  const bytes = await base64ToBytes(base64);
  return window.crypto.subtle.importKey(
    'raw',
    bytes,
    { name: ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function generateRandomKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export function generateAuxiliaryKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#¨%8263964jn!@$&*()-_=+';
  let key = '';
  const array = new Uint32Array(20);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < 20; i++) {
    key += chars[array[i] % chars.length];
  }
  return key;
}

export async function digestSHA256(message: string): Promise<string> {
  try {
    if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(message);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn("Subtle crypto not available or failed, falling back to pure JS SHA-256:", err);
  }

  // Fallback to pure JS implementation
  return sha256Fallback(message);
}

function sha256Fallback(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const lengthProperty = 'length';
  let i, j; // Used as a loop index
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;
  
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const wordsLength = ((asciiLength + 64) >>> 9 << 4) + 15;
  for (i = 0; i < wordsLength; i++) words[i] = 0;
  for (i = 0; i < ascii[lengthProperty]; i++) {
    words[i >>> 2] |= ascii.charCodeAt(i) << (24 - (i % 4) * 8);
  }
  words[asciiLength >>> 5] |= 0x80 << (24 - (asciiLength % 32));
  words[wordsLength] = asciiLength;

  for (i = 0; i < wordsLength; i += 16) {
    const w = [];
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j];
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (j = 0; j < 64; j++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    const hex = (hash[i] >>> 0).toString(16).padStart(8, '0');
    result += hex;
  }
  return result;
}

