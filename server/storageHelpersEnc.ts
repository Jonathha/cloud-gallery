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

export interface EncValidationResult {
  isEnc: boolean;
  isValid: boolean;
  version?: 1 | 2;
  metadata?: any;
  error?: string;
}

export function parseAndValidateEncStructure(buffer: Buffer): EncValidationResult {
  if (!buffer || buffer.length < 8) {
    return { isEnc: false, isValid: false };
  }

  const magic = buffer.toString("utf-8", 0, 4);
  if (magic !== "ENC1" && magic !== "ENC2") {
    return { isEnc: false, isValid: false };
  }

  const metaLen = buffer.readUInt32BE(4);
  if (metaLen <= 0 || metaLen > 262144 || 8 + metaLen > buffer.length) {
    return { isEnc: true, isValid: false, error: "Tamanho de metadados inválido ou truncado" };
  }

  let metadata: any;
  try {
    const metaString = buffer.toString("utf-8", 8, 8 + metaLen);
    metadata = JSON.parse(metaString);
  } catch {
    return { isEnc: true, isValid: false, error: "JSON de metadados inválido" };
  }

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { isEnc: true, isValid: false, error: "Metadados inválidos" };
  }

  if (!metadata.id || typeof metadata.id !== "string") {
    return { isEnc: true, isValid: false, error: "ID ausente ou inválido nos metadados" };
  }

  if (!metadata.userId || typeof metadata.userId !== "string") {
    return { isEnc: true, isValid: false, error: "userId ausente ou inválido nos metadados" };
  }

  if (!metadata.iv || typeof metadata.iv !== "string") {
    return { isEnc: true, isValid: false, error: "iv ausente ou inválido nos metadados" };
  }

  if (magic === "ENC1") {
    if (buffer.length <= 8 + metaLen) {
      return { isEnc: true, isValid: false, error: "Ciphertext ausente no arquivo ENC1" };
    }
    return { isEnc: true, isValid: true, version: 1, metadata };
  }

  if (magic === "ENC2") {
    const thumbSize = metadata.thumbSize;
    const mediaSize = metadata.mediaSize;

    if (typeof thumbSize !== "number" || !Number.isInteger(thumbSize) || thumbSize < 0) {
      return { isEnc: true, isValid: false, error: "thumbSize inválido no arquivo ENC2" };
    }
    if (typeof mediaSize !== "number" || !Number.isInteger(mediaSize) || mediaSize < 0) {
      return { isEnc: true, isValid: false, error: "mediaSize inválido no arquivo ENC2" };
    }

    const expectedLength = 8 + metaLen + thumbSize + mediaSize;
    if (buffer.length !== expectedLength) {
      return { isEnc: true, isValid: false, error: "Tamanho do buffer incompatível com metadados do ENC2" };
    }

    return { isEnc: true, isValid: true, version: 2, metadata };
  }

  return { isEnc: false, isValid: false };
}

