import admin from "firebase-admin";
import { chatAdminApp } from "./chatPushNotifierState";

export async function sendPushNotifications(
  db: admin.firestore.Firestore,
  senderUserId: string,
  userName: string,
  mediaType: string,
  textCiphertext: string,
  textIv: string,
  messageTime: number
) {
  try {
    const tokensSnapshot = await db.collection("user_fcm_tokens").get();
    const tokensData: any[] = [];
    
    tokensSnapshot.forEach((tokenDoc) => {
      const tokenData = tokenDoc.data();
      if (tokenData.token && tokenData.userId !== senderUserId) {
        tokensData.push(tokenData);
      }
    });

    if (tokensData.length === 0) {
      console.log("[PushNotifier] No other active FCM tokens found to notify.");
      return;
    }

    let textToShow = "🔒 Nova mensagem";
    if (mediaType === "audio") {
      textToShow = "🎵 Áudio enviado";
    } else if (mediaType === "image") {
      textToShow = "📷 Imagem enviada";
    } else if (mediaType === "video") {
      textToShow = "🎥 Vídeo enviado";
    }

    console.log(`[PushNotifier] Sending push notifications to ${tokensData.length} device(s)...`);

    const messages: admin.messaging.Message[] = tokensData.map((tokenData) => {
      const baseData = {
        type: "chat_message",
        title: userName || "Usuário",
        body: textToShow || "Nova mensagem",
        userId: senderUserId || "",
        userName: userName || "",
        textCiphertext: textCiphertext || "",
        textIv: textIv || "",
        mediaType: mediaType || "text",
        createdAt: String(messageTime),
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      };

      const isWebview = tokenData.deviceType === "webview";
      
      if (isWebview) {
        return {
          token: tokenData.token,
          notification: {
            title: userName || "Usuário",
            body: textToShow || "Nova mensagem",
          },
          data: baseData,
          android: {
            notification: {
              channelId: "chat_notifications",
              priority: "high"
            }
          }
        };
      } else {
        return {
          token: tokenData.token,
          data: baseData,
          android: {
            priority: "high",
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
                contentAvailable: true
              }
            }
          }
        };
      }
    });

    const messaging = chatAdminApp!.messaging();
    const response = await messaging.sendEach(messages);
    
    console.log(`[PushNotifier] Push success count: ${response.successCount}, failure count: ${response.failureCount}`);
    
    if (response.failureCount > 0) {
      response.responses.forEach(async (resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          const token = tokensData[idx].token;

          if (error && (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          )) {
            console.log("[PushNotifier] Removing unregistered token:", token.substring(0, 15) + "...");
            const queryRes = await db.collection("user_fcm_tokens").where("token", "==", token).get();
            queryRes.forEach(async (docToDel) => {
              await docToDel.ref.delete();
            });
          } else {
            console.error(`[PushNotifier] FCM delivery error for index ${idx}:`, error?.message);
          }
        }
      });
    }
  } catch (err: any) {
    console.error("[PushNotifier] Error querying FCM tokens or sending multicast:", err);
  }
}
