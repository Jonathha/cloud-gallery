export function validateCreatePayload(body) {
  const { id, imageId, ciphertext, iv } = body || {};
  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id) || id.length < 16 || !imageId || !ciphertext || !iv) {
    return false;
  }
  return true;
}

/**
 * Returns an error message when the option combination is not allowed, otherwise null.
 * One-time view links can never allow downloads: the two options are mutually exclusive.
 */
export function validateShareOptions(options) {
  if (options == null) return null;
  if (typeof options !== "object" || Array.isArray(options)) return "Opções de compartilhamento inválidas.";
  if (options.oneTimeView && options.allowDownload !== false) {
    return "Visualização única não pode ser combinada com download permitido.";
  }
  return null;
}

export function buildShareData(body, userId, now) {
  const { id, imageId, ciphertext, iv, contentType, totalSize, isChunked, chunkCount, options } = body;
  return {
    id,
    imageId,
    userId,
    ciphertext,
    iv,
    isChunked: isChunked || false,
    chunkCount: chunkCount || 1,
    contentType: contentType || 'image/png',
    totalSize: totalSize || 0,
    status: 'pending',
    options: {
      requirePassword: !!options?.requirePassword,
      encryptedShareKey: options?.encryptedShareKey || null,
      ivShareKey: options?.ivShareKey || null,
      allowDownload: !options?.oneTimeView && options?.allowDownload !== false,
      oneTimeView: !!options?.oneTimeView,
      expiresAt: options?.expiresAt ? Number(options.expiresAt) : null
    },
    createdAt: now,
    updatedAt: now,
    firstViewedAt: null,
    firstViewerIp: null
  };
}

export function isClaimConflictError(err) {
  if (!err) return false;
  return (
    err.code === 'ALREADY_EXISTS' || 
    err.code === 'PRECONDITION_FAILED' || 
    err.status === 409 || 
    err.message?.includes('ALREADY_EXISTS') || 
    err.message?.includes('FAILED_PRECONDITION') || 
    err.message?.includes('ABORTED')
  );
}
