import express from "express";
import { ensureDir } from "./storageHelpers";
import { getImages, getProtectedImages } from "./storageControllerGet";
import { uploadImage, getImageById, deleteImageById, getThumbnailById, uploadThumbnail } from "./storageControllerUploadDelete";
import { uploadRawImage } from "./storageUploadRaw";
import { requireAuth } from "./authMiddleware";

const router = express.Router();

ensureDir();

// Protect all storage endpoints with JWT Authentication
router.use(requireAuth);

// 1. Get all image metadata for authenticated user
router.get('/images', getImages);
router.get('/protected-images', getProtectedImages);

// 2. Upload/Save full un-chunked image or video file
router.post('/upload', uploadImage);
router.post('/upload-raw', uploadRawImage);
router.post('/upload-thumbnail/:id', uploadThumbnail);

// 3. Get single full un-chunked image/video data
router.get('/image/:id', getImageById);
router.get('/thumbnail/:id', getThumbnailById);

// 4. Delete single image/video file
router.delete('/image/:id', deleteImageById);

export default router;
