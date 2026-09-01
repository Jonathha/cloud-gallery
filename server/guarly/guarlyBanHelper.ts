import { BanInfo } from "./guarlyTypes";
import { isGreetingMessage } from "./guarlyKnowledgeHelpers";

const SEVERE_INSULT_REGEX = /\b(vnc|vtc|porra|caralho|puta|fdp|filho da puta|corno|desgra[çc]a|desgra[çc]ado|tnc|marmota|lixo de ia|vai se foder|arrombado|cacete|ot[aá]rio|ot[aá]ria|burro|burra|vagabundo|idiota|imbecil|babaca|pau no cu|vsf)\b/i;

export function handleResponseBan(
  rawReply: string,
  localBanStore: Map<string, BanInfo>,
  userUid: string | null,
  userEmail: string | null,
  lastUserMsg: string = ""
): {
  cleanReply: string;
  newlyBanned: boolean;
  banExpiresAt: number;
  banReason: string;
} {
  let newlyBanned = false;
  let banExpiresAt = 0;
  let banReason = "";

  const banRegex = /\[BAN:\s*(\d+)\s*:\s*(.*?)\s*\]/i;
  const banMatch = rawReply.match(banRegex);
  if (banMatch) {
    const cleanReplyText = rawReply.replace(banRegex, "").trim();

    // False positive guard: Never ban if last message was a greeting or contains no severe insult/profanity
    const trimmedUserMsg = lastUserMsg.trim().toLowerCase();
    const isSafeMessage = isGreetingMessage(trimmedUserMsg) || !SEVERE_INSULT_REGEX.test(trimmedUserMsg);

    if (isSafeMessage) {
      console.warn("[GuarlyAI] Ignored false positive BAN tag for non-abusive message:", lastUserMsg);
      return { cleanReply: cleanReplyText, newlyBanned: false, banExpiresAt: 0, banReason: "" };
    }

    if (!userUid) {
      return { cleanReply: cleanReplyText, newlyBanned: false, banExpiresAt: 0, banReason: "" };
    }

    const minutes = Math.min(20, Math.max(1, parseInt(banMatch[1], 10) || 1));
    const reason = banMatch[2] || "Linguagem desrespeitosa";
    const banData: BanInfo = { bannedAt: Date.now(), expiresAt: Date.now() + minutes * 60000, reason };

    localBanStore.set(`uid_${userUid}`, banData);
    newlyBanned = true;
    banExpiresAt = banData.expiresAt;
    banReason = banData.reason;

    return {
      cleanReply: cleanReplyText,
      newlyBanned,
      banExpiresAt,
      banReason
    };
  }

  return { cleanReply: rawReply, newlyBanned, banExpiresAt, banReason };
}

