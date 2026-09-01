import { jsonResponse } from "./workerHelpers.js";
import { SignJWT, importPKCS8 } from "jose";
import { CHAT_SERVICE_ACCOUNT } from "./workerChatState.js";
import { validateBanco1Token } from "./workerChatAuth.js";

async function getGoogleAccessToken() {
  const { client_email, private_key } = CHAT_SERVICE_ACCOUNT;
  const key = await importPKCS8(private_key, "RS256");

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore"
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(client_email)
    .setSubject(client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Failed to get FCM token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

export async function handleChatNotify(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    const verifiedUser = await validateBanco1Token(authHeader);
    
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    
    const body = await request.json();
    const { textToShow, senderUserId, userName, mediaType, textCiphertext, textIv, messageTime } = body;
    
    const accessToken = await getGoogleAccessToken();
    
    // Fetch tokens from Firestore REST API
    const projectId = "chat-809dc";
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/user_fcm_tokens`;
    const firestoreRes = await fetch(firestoreUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    
    let tokens = [];
    if (firestoreRes.ok) {
      const data = await firestoreRes.json();
      if (data.documents) {
        for (const doc of data.documents) {
          if (doc.fields && doc.fields.token && doc.fields.token.stringValue && doc.fields.userId && doc.fields.userId.stringValue !== senderUserId) {
            tokens.push(doc.fields.token.stringValue);
          }
        }
      }
    } else {
      console.error("[handleChatNotify] Failed to fetch FCM tokens from Firestore", await firestoreRes.text());
    }
    
    if (!tokens || !tokens.length) {
      return jsonResponse({ success: true, message: "No tokens to notify" });
    }
    
    const sendPromises = tokens.map(async (token) => {
      const payload = {
        message: {
          token: token,
          notification: {
            title: userName || "Usuário",
            body: textToShow || "Nova mensagem"
          },
          data: {
            type: "chat_message",
            userId: senderUserId || "",
            userName: userName || "",
            textCiphertext: textCiphertext || "",
            textIv: textIv || "",
            mediaType: mediaType || "text",
            createdAt: String(messageTime || Date.now()),
            click_action: "FLUTTER_NOTIFICATION_CLICK"
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              channel_id: "guarly_chat_channel"
            }
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1
              }
            }
          }
        }
      };
      
      const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      return fcmRes.json();
    });
    
    const results = await Promise.allSettled(sendPromises);
    return jsonResponse({ success: true, results });
  } catch (err) {
    console.error("[handleChatNotify] Detailed Error:", err, err.stack);
    return jsonResponse({ 
      success: false, 
      error: err.message || "Notification failed",
      stack: err.stack
    }, 500);
  }
}
