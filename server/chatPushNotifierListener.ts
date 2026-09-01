import admin from "firebase-admin";
import fs from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chatAdminApp, setChatAdminApp, serverBootTime, seenMessageIds } from "./chatPushNotifierState";
import { sendPushNotifications } from "./chatPushNotifierSender";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startChatPushNotifier() {
  try {
    const serviceAccountPath = path.join(__dirname, "firebaseChatServiceAccount.json");
    
    try {
      await fs.access(serviceAccountPath);
    } catch {
      console.warn("[PushNotifier] Service account file not found. Push notifications will be disabled.");
      return;
    }

    const serviceAccountContent = await fs.readFile(serviceAccountPath, "utf-8");
    const serviceAccount = JSON.parse(serviceAccountContent);

    const appName = "chat-admin-push";
    const existingApps = admin.apps;
    const existing = existingApps.find(app => app?.name === appName);
    
    if (existing) {
      setChatAdminApp(existing);
    } else {
      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      }, appName);
      setChatAdminApp(app);
    }

    console.log("[PushNotifier] Firebase Admin SDK initialized for project:", serviceAccount.project_id);

    const db = chatAdminApp!.firestore();
    
    db.collection("chat_messages")
      .orderBy("createdAt", "desc")
      .limit(5)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const docId = change.doc.id;
            const data = change.doc.data();

            if (seenMessageIds.has(docId)) {
              return;
            }
            seenMessageIds.add(docId);

            if (!data.createdAt) {
              return;
            }

            let messageTime = 0;
            if (typeof data.createdAt.toMillis === "function") {
              messageTime = data.createdAt.toMillis();
            } else if (data.createdAt.seconds) {
              messageTime = data.createdAt.seconds * 1000;
            } else if (data.createdAt._seconds) {
              messageTime = data.createdAt._seconds * 1000;
            } else if (typeof data.createdAt === "number") {
              messageTime = data.createdAt;
            } else {
              return;
            }

            if (messageTime < serverBootTime - 5000) {
              return;
            }

            const senderUserId = data.userId;
            const userName = data.userName || "Usuário";
            const mediaType = data.mediaType || "text";
            const textCiphertext = data.textCiphertext || "";
            const textIv = data.textIv || "";

            console.log(`[PushNotifier] New message detected from ${userName} (${senderUserId}). Preparing notifications...`);

            await sendPushNotifications(db, senderUserId, userName, mediaType, textCiphertext, textIv, messageTime);
          }
        });
      }, (err) => {
        console.error("[PushNotifier] Realtime listener error:", err);
      });

  } catch (err: any) {
    console.error("[PushNotifier] Failed to start push notifier setup:", err);
  }
}
