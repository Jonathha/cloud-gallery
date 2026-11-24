export function buildShareData(
  id: string,
  imageId: string,
  authUid: string,
  ciphertext: string,
  iv: string,
  options: any,
  body: any,
  now: number
) {
  return {
    id,
    imageId,
    userId: authUid,
    ciphertext,
    iv,
    isChunked: body.isChunked || false,
    chunkCount: body.chunkCount || 1,
    contentType: body.contentType || 'image/png',
    totalSize: body.totalSize || 0,
    status: 'pending',
    options: {
      requirePassword: Boolean(options?.requirePassword),
      encryptedShareKey: options?.encryptedShareKey || null,
      ivShareKey: options?.ivShareKey || null,
      allowDownload: !options?.oneTimeView && options?.allowDownload !== false,
      oneTimeView: Boolean(options?.oneTimeView),
      expiresAt: options?.expiresAt || null
    },
    createdAt: now,
    updatedAt: now,
    firstViewedAt: null,
    firstViewerIp: null
  };
}

export function buildActiveClaimPayload(id: string, imageId: string, authUid: string, options: any, now: number) {
  return {
    id,
    shareId: id,
    imageId,
    userId: authUid,
    status: 'pending',
    options,
    createdAt: now,
    updatedAt: now,
    firstViewedAt: null
  };
}
