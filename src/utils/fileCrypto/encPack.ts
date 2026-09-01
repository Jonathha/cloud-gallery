export function packEncryptedFile(metadata: any, ciphertextBase64: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const metaBytes = encoder.encode(JSON.stringify(metadata));
  
  const binaryStr = atob(ciphertextBase64);
  const ciphertextBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    ciphertextBytes[i] = binaryStr.charCodeAt(i);
  }
  
  const totalLength = 4 + 4 + metaBytes.byteLength + ciphertextBytes.byteLength;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  
  view.setUint8(0, 0x45); // 'E'
  view.setUint8(1, 0x4e); // 'N'
  view.setUint8(2, 0x43); // 'C'
  view.setUint8(3, 0x31); // '1'
  
  view.setUint32(4, metaBytes.byteLength, false);
  
  const uint8 = new Uint8Array(buffer);
  uint8.set(metaBytes, 8);
  uint8.set(ciphertextBytes, 8 + metaBytes.byteLength);
  
  return buffer;
}

export function packEncryptedFileV2(
  metadata: any,
  thumbnailCiphertextBase64: string,
  ciphertextBase64: string
): ArrayBuffer {
  const encoder = new TextEncoder();

  let thumbBytes = new Uint8Array(0);
  if (thumbnailCiphertextBase64) {
    const binaryStr = atob(thumbnailCiphertextBase64);
    thumbBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      thumbBytes[i] = binaryStr.charCodeAt(i);
    }
  }

  let mediaBytes = new Uint8Array(0);
  if (ciphertextBase64) {
    const binaryStr = atob(ciphertextBase64);
    mediaBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      mediaBytes[i] = binaryStr.charCodeAt(i);
    }
  }

  const metaToStore = {
    ...metadata,
    version: 2,
    thumbSize: thumbBytes.byteLength,
    mediaSize: mediaBytes.byteLength
  };

  const metaBytes = encoder.encode(JSON.stringify(metaToStore));
  const totalLength = 4 + 4 + metaBytes.byteLength + thumbBytes.byteLength + mediaBytes.byteLength;

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  view.setUint8(0, 0x45); // 'E'
  view.setUint8(1, 0x4e); // 'N'
  view.setUint8(2, 0x43); // 'C'
  view.setUint8(3, 0x32); // '2'

  view.setUint32(4, metaBytes.byteLength, false);

  const uint8 = new Uint8Array(buffer);
  uint8.set(metaBytes, 8);

  if (thumbBytes.byteLength > 0) {
    uint8.set(thumbBytes, 8 + metaBytes.byteLength);
  }

  if (mediaBytes.byteLength > 0) {
    uint8.set(mediaBytes, 8 + metaBytes.byteLength + thumbBytes.byteLength);
  }

  return buffer;
}
