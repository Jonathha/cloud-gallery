import { readChunks, replaceDatasetUnlocked } from "./d1Chunks.js";
import { withDatasetLock } from "./d1Locks.js";
import { RATE_LIMIT_WINDOW_MS, MAX_MESSAGES_PER_WINDOW } from "./d1Cleanup.js";

const MESSAGES_DATASET = "Mensagem";
const MAX_STORED_MESSAGES = 1000;

export async function getChatMessages(limit = 100, env) {
  const chunks = await readChunks(MESSAGES_DATASET, env);
  const messages = chunks.flatMap(c => c.items).filter(Boolean);
  messages.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return messages.slice(0, Math.max(1, Math.min(limit, 500)));
}

// Página de mensagens mais recentes (ordem decrescente). `cursor` = { before, beforeId } traz as mais antigas que ele.
export async function getChatMessagesPage(limit = 23, cursor = null, env) {
  const chunks = await readChunks(MESSAGES_DATASET, env);
  const all = chunks.flatMap(c => c.items).filter(Boolean);
  all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || String(b.id).localeCompare(String(a.id)));

  let start = 0;
  if (cursor && Number.isFinite(cursor.before)) {
    const hasId = cursor.beforeId !== undefined && cursor.beforeId !== null && cursor.beforeId !== "";
    start = all.findIndex(m => {
      const t = m.createdAt || 0;
      return t < cursor.before || (hasId && t === cursor.before && String(m.id) < String(cursor.beforeId));
    });
    if (start < 0) start = all.length;
  }

  const size = Math.max(1, Math.min(Number(limit) || 23, 500));
  return { messages: all.slice(start, start + size), hasMore: start + size < all.length };
}

export async function saveChatMessage(message, env) {
  return withDatasetLock(MESSAGES_DATASET, env, async () => {
    const chunks = await readChunks(MESSAGES_DATASET, env);
    const messages = chunks.flatMap(c => c.items).filter(Boolean);
    const existingIndex = messages.findIndex(m => m && m.id === message.id);
    if (existingIndex >= 0 && messages[existingIndex].userId !== message.userId) {
      throw new Error("Não autorizado: mensagem pertence a outro usuário");
    }
    const now = Date.now();
    const userMsgs = messages.filter(m => m?.userId === message.userId && (now - (m.createdAt || 0)) < RATE_LIMIT_WINDOW_MS);
    if (existingIndex < 0 && userMsgs.length >= MAX_MESSAGES_PER_WINDOW) {
      const oldest = Math.min(...userMsgs.map(m => m.createdAt || now));
      const retryAfter = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
      const err = new Error("Limite de mensagens atingido. Aguarde antes de enviar novamente.");
      err.rateLimited = true;
      err.limitType = "messages";
      err.retryAfter = retryAfter;
      throw err;
    }
    if (message.replyToId) {
      const referencedExists = messages.some(m => m && m.id === message.replyToId);
      if (!referencedExists) {
        delete message.replyToId;
        delete message.replyToUserName;
        delete message.replyToText;
        delete message.replyToCiphertext;
        delete message.replyToIv;
      }
    }
    if (existingIndex >= 0) {
      messages[existingIndex] = { ...messages[existingIndex], ...message };
    } else {
      messages.push(message);
    }
    messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    if (messages.length > MAX_STORED_MESSAGES) {
      messages.splice(0, messages.length - MAX_STORED_MESSAGES);
    }
    await replaceDatasetUnlocked(MESSAGES_DATASET, messages, env);
    return message;
  });
}

export async function deleteChatMessage(messageId, env) {
  return withDatasetLock(MESSAGES_DATASET, env, async () => {
    const chunks = await readChunks(MESSAGES_DATASET, env);
    const messages = chunks.flatMap(c => c.items).filter(Boolean);
    const index = messages.findIndex(m => m && m.id === messageId);
    if (index < 0) return { deleted: false, message: null };
    const [removed] = messages.splice(index, 1);
    await replaceDatasetUnlocked(MESSAGES_DATASET, messages, env);
    return { deleted: true, message: removed };
  });
}


export async function deleteChatMessages(messageIds, env) {
  const idSet = new Set(messageIds);
  return withDatasetLock(MESSAGES_DATASET, env, async () => {
    const chunks = await readChunks(MESSAGES_DATASET, env);
    const messages = chunks.flatMap(c => c.items).filter(Boolean);
    const removed = [];
    const kept = [];
    for (const m of messages) {
      if (m && idSet.has(m.id)) removed.push(m);
      else kept.push(m);
    }
    if (removed.length > 0) {
      await replaceDatasetUnlocked(MESSAGES_DATASET, kept, env);
    }
    return { removed };
  });
}
