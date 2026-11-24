import { getChatMessagesPage } from "../../../chatGlobalD1.js";
import { getChatPresence } from "../../../userSync.js";
import { decryptChatText } from "../chatCrypto.js";
import { AI_USER_ID, AI_USER_NAME, CHAT_TIMEZONE, MAX_CONTEXT_CHARS_PER_MESSAGE } from "./chatAiConfig.js";

const AUDIO_LABEL = "[mensagem de voz]";

async function resolveText(m) {
  if (m.mediaType === "audio") return AUDIO_LABEL;
  if (typeof m.text === "string" && m.text) return m.text;
  if (m.textCiphertext && m.textIv) {
    try { return await decryptChatText(m.textCiphertext, m.textIv); } catch { return ""; }
  }
  return "";
}

/** Carrega até `limit` mensagens mais recentes em ordem cronológica com texto legível e referências de resposta. */
export async function loadRecentMessages(env, limit) {
  const { messages } = await getChatMessagesPage(limit, null, env);
  const chronological = [...messages].reverse();
  const out = [];
  for (const m of chronological) {
    const plain = (await resolveText(m)).replace(/\s+/g, " ").trim();
    const replyText = typeof m.replyToText === "string" ? m.replyToText.replace(/\s+/g, " ").trim() : "";
    out.push({
      id: m.id,
      userId: m.userId,
      userName: (m.userId === AI_USER_ID || m.userId === "ai-assistant-system") ? AI_USER_NAME : (m.userName || "Usuário"),
      createdAt: Number(m.createdAt) || 0,
      mediaType: m.mediaType,
      text: plain,
      replyToId: m.replyToId || null,
      replyToUserName: m.replyToUserName || "",
      replyToText: replyText
    });
  }
  return out;
}

/** Descreve quantas pessoas e quem está online dentro do Chat Global agora. */
export async function describePresence() {
  const { users } = await getChatPresence();
  const humans = users.filter(u => u && u.userId !== AI_USER_ID && u.userId !== "ai-assistant-system");
  if (humans.length === 0) {
    return "Online no Chat Global agora (0 usuários humanos detectados no momento, além de você, IA).";
  }
  const names = humans.map(u => u.userName).join(", ");
  return `Online no Chat Global agora (${humans.length} ${humans.length === 1 ? "pessoa" : "pessoas"}, além de você, IA): ${names}`;
}

const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: CHAT_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: CHAT_TIMEZONE, day: "2-digit", month: "2-digit" });
const nowFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: CHAT_TIMEZONE,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

export function describeNow(now = Date.now()) {
  return nowFmt.format(new Date(now));
}

function formatAgePt(ms) {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin > 0 ? `${hrs}h ${remMin}min` : `${hrs}h`;
}

function clipText(raw, maxChars) {
  const chars = [...String(raw || "")];
  if (chars.length <= maxChars) return chars.join("");
  return chars.slice(0, maxChars).join("") + "…";
}

function formatReplyTag(m, numberById) {
  const refNum = m.replyToId && numberById ? numberById.get(m.replyToId) : null;
  if (!refNum && !m.replyToUserName && !m.replyToText) return "";
  const who = m.replyToUserName || "mensagem anterior";
  const quote = m.replyToText ? `: "${clipText(m.replyToText, 110)}"` : "";
  if (refNum) return ` (respondendo à #${refNum} de ${who}${quote})`;
  return ` (respondendo a ${who}${quote})`;
}

export function formatLine(m, number, now = Date.now(), numberById = null) {
  const d = new Date(m.createdAt);
  const sameDay = dayFmt.format(d) === dayFmt.format(new Date(now));
  const when = sameDay ? timeFmt.format(d) : `${dayFmt.format(d)} ${timeFmt.format(d)}`;
  const reply = formatReplyTag(m, numberById);
  const text = clipText(m.text || "[sem texto]", MAX_CONTEXT_CHARS_PER_MESSAGE);
  return `#${number} | ${when} | ${m.userName}${reply}: ${text}`;
}

export function buildTranscript(messages, startNumber = 1, now = Date.now(), allMessages = messages) {
  const numberById = new Map();
  const baseList = Array.isArray(allMessages) && allMessages.length > 0 ? allMessages : messages;
  const baseStart = baseList === messages ? startNumber : 1;
  baseList.forEach((m, idx) => {
    if (m?.id) numberById.set(m.id, baseStart + idx);
  });
  return messages
    .map((m, idx) => formatLine(m, startNumber + idx, now, numberById))
    .join("\n");
}

/** Gera resumo direto da mensagem avaliada, citação alvo e tempo desde a última fala da IA. */
export function describeConversationContext(recent, now = Date.now(), targetMessageId = null) {
  if (!Array.isArray(recent) || recent.length === 0) return "";
  const numberById = new Map();
  recent.forEach((m, idx) => {
    if (m?.id) numberById.set(m.id, idx + 1);
  });

  const targetIdx = targetMessageId ? recent.findIndex(m => m.id === targetMessageId) : recent.length - 1;
  const activeIdx = targetIdx >= 0 ? targetIdx : recent.length - 1;
  const activeMsg = recent[activeIdx];
  const parts = [`Mensagem em foco: #${activeIdx + 1} (de ${activeMsg.userName}, há ${formatAgePt(now - activeMsg.createdAt)})`];

  if (activeMsg.replyToId || activeMsg.replyToUserName) {
    const refNum = activeMsg.replyToId ? numberById.get(activeMsg.replyToId) : null;
    const quote = activeMsg.replyToText ? ` "${clipText(activeMsg.replyToText, 80)}"` : "";
    parts.push(`ela cita ${refNum ? `#${refNum} de ` : ""}${activeMsg.replyToUserName || "mensagem"}${quote}`);
  }

  let lastAiIdx = -1;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].userId === AI_USER_ID || recent[i].userId === "ai-assistant-system") {
      lastAiIdx = i;
      break;
    }
  }
  if (lastAiIdx >= 0) {
    const afterCount = recent.length - 1 - lastAiIdx;
    parts.push(`última fala da ${AI_USER_NAME}: #${lastAiIdx + 1} (há ${formatAgePt(now - recent[lastAiIdx].createdAt)}, ${afterCount} ${afterCount === 1 ? "mensagem" : "mensagens"} depois)`);
  }

  return "Contexto direto: " + parts.join(" | ") + ".";
}

/** Converte "#12" ou "12" na mensagem correspondente do array `messages` (1-based). */
export function resolveRef(ref, messages) {
  if (ref === null || ref === undefined) return null;
  const match = String(ref).match(/\d+/);
  if (!match) return null;
  const index = Number(match[0]) - 1;
  return Number.isInteger(index) && index >= 0 && index < messages.length ? messages[index] : null;
}

export function previewForReply(m) {
  if (m.mediaType === "audio") return "Mensagem de voz";
  return [...(m.text || "")].slice(0, 200).join("");
}
