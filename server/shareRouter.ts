import express from "express";
import { findExistingShare, createShare, deleteShare, viewShare } from "./shareService";
import { requireAuth } from "./authMiddleware";

const router = express.Router();

// 1. Find existing share for an image (Requires Authentication)
router.get('/image/:imageId', requireAuth, findExistingShare);

// 2. Create or Update share (Requires Authentication)
router.post('/create', requireAuth, createShare);

// 3. Delete/Cancel share link (Requires Authentication)
router.delete('/:shareId', requireAuth, deleteShare);

// 4. Public secure view for share links (No Authentication Required)
router.get('/view/:shareId', viewShare);

export default router;

