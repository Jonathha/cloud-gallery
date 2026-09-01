import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs/promises";
import path from "path";

let db: any = null;

export async function initFirebase() {
  try {
    // In AI Studio, the backend server runs with Application Default Credentials
    // for the platform, which DO NOT have access to the user's Firebase project.
    // Therefore, using firebase-admin here will always result in PERMISSION_DENIED.
    // We intentionally disable it to avoid failing with grpc-js errors.
    console.log('[Server] Firebase Admin disabled (running in AI Studio without service account).');
    db = null;
  } catch (err) {
    console.error('[Server] Failed to initialize Firebase Admin:', err);
  }
}

export function getDB() {
  return db;
}
