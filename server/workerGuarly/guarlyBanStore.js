import { isGreetingMessage } from "./guarlyKnowledgeHelpers.js";

const SEVERE_INSULT_REGEX = /\b(vnc|vtc|porra|caralho|puta|fdp|filho da puta|corno|desgra[çc]a|desgra[çc]ado|tnc|marmota|lixo de ia|vai se foder|arrombado|cacete|ot[aá]rio|ot[aá]ria|burro|burra|vagabundo|idiota|imbecil|babaca|pau no cu|vsf)\b/i;

const localBanStore = new Map();

export async function getBanInfo(key, _env) {
  const storeKey = `ban_${key}`;
  return localBanStore.get(storeKey) || null;
}

export async function setBanInfo(key, banData, _env) {
  const storeKey = `ban_${key}`;
  const ttl = banData.expiresAt - Date.now();
  if (ttl <= 0) return;

  localBanStore.set(storeKey, banData);
}

export async function handleResponseBanWorker(rawReply, userUid, userEmail, env, lastUserMsg = "") {
  let newlyBanned = false;
  let banExpiresAt = 0;
  let banReason = "";

  const banRegex = /\[BAN:\s*(\d+)\s*:\s*(.*?)\s*\]/i;
  const banMatch = rawReply.match(banRegex);
  if (banMatch) {
    const cleanReplyText = rawReply.replace(banRegex, "").trim();

    // False positive guard: Never ban if last message was a greeting or contains no severe insult/profanity
    const trimmedUserMsg = String(lastUserMsg || "").trim().toLowerCase();
    const isSafeMessage = isGreetingMessage(trimmedUserMsg) || !SEVERE_INSULT_REGEX.test(trimmedUserMsg);

    if (isSafeMessage) {
      console.warn("[GuarlyAI Worker] Ignored false positive BAN tag for non-abusive message:", lastUserMsg);
      return { cleanReply: cleanReplyText, newlyBanned: false, banExpiresAt: 0, banReason: "" };
    }

    if (!userUid) {
      return { cleanReply: cleanReplyText, newlyBanned: false, banExpiresAt: 0, banReason: "" };
    }

    const minutes = Math.min(20, Math.max(1, parseInt(banMatch[1], 10) || 1));
    const reason = banMatch[2] || "Linguagem desrespeitosa";
    const banData = { bannedAt: Date.now(), expiresAt: Date.now() + minutes * 60000, reason };

    await setBanInfo(`uid_${userUid}`, banData, env);
    newlyBanned = true;
    banExpiresAt = banData.expiresAt;
    banReason = banData.reason;

    return { cleanReply: cleanReplyText, newlyBanned, banExpiresAt, banReason };
  }

  return { cleanReply: rawReply, newlyBanned, banExpiresAt, banReason };
}

