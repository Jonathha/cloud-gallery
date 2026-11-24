/**
 * Reads and validates audio format and calculates duration in ms for 16-bit mono PCM WAV
 */
export function readWavDuration(bytes) {
  if (bytes.length < 44) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const read4 = (offset) => String.fromCharCode(...bytes.slice(offset, offset + 4));
  if (read4(0) !== "RIFF" || read4(8) !== "WAVE") return 0;

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let blockAlign = 0;
  let byteRate = 0;
  let dataSize = 0;
  let fmtFound = false;
  let dataFound = false;

  while (offset + 8 <= bytes.length) {
    const id = read4(offset);
    const size = view.getUint32(offset + 4, true);
    const end = offset + 8 + size;
    if (end > bytes.length) return 0;

    if (id === "fmt ") {
      if (size < 16) return 0;
      const audioFormat = view.getUint16(offset + 8, true);
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      byteRate = view.getUint32(offset + 16, true);
      blockAlign = view.getUint16(offset + 20, true);
      bitsPerSample = view.getUint16(offset + 22, true);
      if (audioFormat !== 1 || channels !== 1 || bitsPerSample !== 16 ||
          sampleRate < 8000 || sampleRate > 48000 ||
          blockAlign !== 2 || byteRate !== sampleRate * blockAlign) return 0;
      fmtFound = true;
    }

    if (id === "data") {
      dataSize = size;
      dataFound = true;
      break;
    }

    offset = end + (size % 2);
  }

  if (!fmtFound || !dataFound || dataSize <= 0 || dataSize % 2 !== 0) return 0;
  return (dataSize / byteRate) * 1000;
}
