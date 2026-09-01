import { Response } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { queryFirestoreREST } from "./firestoreREST";

export async function getImages(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing authenticated user' });
    }

    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : "";
    if (!idToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing session token' });
    }

    // Retrieve image metadata from Firestore where userId == authenticated userId
    const dbImages = await queryFirestoreREST('images', userId, idToken);

    const images = dbImages
      .filter((data: any) => data && !data.isProtected)
      .map((data: any) => ({
        id: data.id,
        createdAt: data.createdAt || Date.now(),
        userId: data.userId,
        contentType: data.contentType || 'image/png',
        totalSize: data.totalSize || 0,
        isChunked: data.isChunked || false,
        chunkCount: data.chunkCount || 1,
        thumbnailCiphertext: data.thumbnailCiphertext || '',
        thumbnailIv: data.thumbnailIv || '',
        fileKeyCiphertext: data.fileKeyCiphertext || '',
        fileKeyIv: data.fileKeyIv || '',
        fileSalt: data.fileSalt || '',
        iv: data.iv || ''
      }));

    images.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, images });
  } catch (err: any) {
    console.error('[StorageControllerGet] Error listing images from Firestore:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

