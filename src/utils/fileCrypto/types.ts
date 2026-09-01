export interface EncryptedMetadata {
  id?: string;
  userId?: string;
  iv?: string;
  originalName?: string;
  size?: number;
  timestamp?: number;
  version?: number;
  thumbSize?: number;
  mediaSize?: number;
  [key: string]: any;
}

export interface DecryptWorkerOptions {
  buffer?: ArrayBuffer;
  ciphertextBytes?: Uint8Array | ArrayBuffer;
  ciphertextBase64?: string;
  fileSalt?: string;
  fileKeyStr?: string;
  iv: string;
  isEnvelope: boolean;
  rawMasterKey?: string;
}

export interface UnpackResult {
  metadata: any;
  ciphertextBase64: string;
  thumbnailCiphertextBase64?: string;
}

export interface UnpackRawResult {
  metadata: any;
  ciphertextBytes: Uint8Array;
  thumbBytes?: Uint8Array;
}
