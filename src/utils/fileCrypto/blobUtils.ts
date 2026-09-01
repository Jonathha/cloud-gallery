export function decryptedBufferToBlobUrl(decryptedBuffer: ArrayBuffer, contentType: string = "image/jpeg"): string {
  if (!decryptedBuffer || decryptedBuffer.byteLength === 0) {
    throw new Error("Buffer de imagem vazio após descriptografia");
  }

  const u8 = new Uint8Array(decryptedBuffer);

  if (u8.length >= 5 && u8[0] === 0x64 && u8[1] === 0x61 && u8[2] === 0x74 && u8[3] === 0x61 && u8[4] === 0x3a) {
    try {
      const text = new TextDecoder('utf-8').decode(decryptedBuffer);
      if (text.startsWith("data:")) {
        const commaIdx = text.indexOf(",");
        if (commaIdx !== -1) {
          const header = text.substring(0, commaIdx);
          const base64Data = text.substring(commaIdx + 1);
          let mime = contentType || "image/jpeg";
          const match = header.match(/data:([^;]+)/);
          if (match && match[1]) {
            mime = match[1];
          }
          const binaryStr = atob(base64Data);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mime });
          return URL.createObjectURL(blob);
        }
        return text;
      }
    } catch (e) {
      console.warn("Failed to decode UTF-8 data URL from decrypted buffer, falling back to raw blob:", e);
    }
  }

  const blob = new Blob([decryptedBuffer], { type: contentType || 'image/jpeg' });
  return URL.createObjectURL(blob);
}
