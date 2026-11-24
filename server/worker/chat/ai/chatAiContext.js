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

/** Carrega até `limit` mensagens mais recentes em ordem cronológica com texto legível. */
export async function loadRecentMessages(env, limit) {
  const { messages } = await getChatMessagesPage(limit, null, env);
  const chronological = [...messages].reverse();
  const out = [];
  for (const m of chronological) {
    const plain = (await resolveText(m)).replace(/\s+/g, " ").trim();
    out.push({
      id: m.id,
      userId: m.userId,
      userName: (m.userId === AI_USER_ID || m.userId === "ai-assistant-system") ? AI_USER_NAME : (m.userName || "Usuário"),
      createdAt: Number(m.createdAt) || 0,
      mediaType: m.mediaType,
      text: plain,
      replyToUserName: m.replyToUserName
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

export function formatLine(m, number, now = Date.now()) {
  const d = new Date(m.createdAt);
  const sameDay = dayFmt.format(d) === dayFmt.format(new Date(now));
  const when = sameDay ? timeFmt.format(d) : `${dayFmt.format(d)} ${timeFmt.format(d)}`;
  const reply = m.replyToUserName ? ` (respondendo a ${m.replyToUserName})` : "";
  let text = m.text || "[sem texto]";
  if ([...text].length > MAX_CONTEXT_CHARS_PER_MESSAGE) {
    text = [...text].slice(0, MAX_CONTEXT_CHARS_PER_MESSAGE).join("") + "…";
  }
  return `#${number} | ${when} | ${m.userName}${reply}: ${text}`;
}

export function buildTranscript(messages, startNumber = 1, now = Date.now()) {
  return messages
    .map((m, idx) => formatLine(m, startNumber + idx, now))
    .join("\n");
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
