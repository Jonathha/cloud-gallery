export function isEncBinary(buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  const magic = buffer.toString("utf-8", 0, 4);
  return magic === "ENC1" || magic === "ENC2";
}

export function wrapJsonToEnc(fileData: any): Buffer {
  const { ciphertext, ...metadata } = fileData;
  const metaBytes = Buffer.from(JSON.stringify(metadata), "utf-8");
  const ciphertextBytes = Buffer.from(ciphertext || "", "base64");
  
  const header = Buffer.alloc(8);
  header.write("ENC1", 0, 4, "utf-8");
  header.writeUInt32BE(metaBytes.length, 4);
  
  return Buffer.concat([header, metaBytes, ciphertextBytes]);
}

export function getMetadataFromEnc(buffer: Buffer): any {
  const metaLen = buffer.readUInt32BE(4);
  const metaString = buffer.toString("utf-8", 8, 8 + metaLen);
  return JSON.parse(metaString);
}

export function updateEncMetadata(buffer: Buffer, newMetadata: any): Buffer {
  const metaLen = buffer.readUInt32BE(4);
  const ciphertextBytes = buffer.subarray(8 + metaLen);
  const newMetaBytes = Buffer.from(JSON.stringify(newMetadata), "utf-8");
  
  const header = Buffer.alloc(8);
  header.write("ENC1", 0, 4, "utf-8");
  header.writeUInt32BE(newMetaBytes.length, 4);
  
  return Buffer.concat([header, newMetaBytes, ciphertextBytes]);
}
