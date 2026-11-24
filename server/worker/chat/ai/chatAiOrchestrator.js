import { saveChatMessage } from "../../../chatGlobalD1.js";
import { bumpUserVersion } from "../../../userSync.js";
import { CHAT_GLOBAL_SYNC_KEY } from "../chatPushApi.js";
import { dispatchChatPushNotifications } from "../chatWebPush.js";
import {
  AI_USER_ID,
  AI_USER_NAME,
  CONTINUE_MAX_AGE_MS,
  CONTINUE_MIN_AGE_MS,
  GEMINI_CONTEXT_MESSAGES,
  GROQ_CONTEXT_MESSAGES,
  MAX_CONTINUATIONS_IN_ROW,
  MAX_REPLY_CHARS,
  SETTLE_MS
} from "./chatAiConfig.js";
import { GEMINI_SYSTEM_PROMPT, GROQ_CONTINUE_SYSTEM_PROMPT, GROQ_GATE_SYSTEM_PROMPT } from "./chatAiPrompts.js";
import { callGeminiWriter, callGroqGate } from "./chatAiClients.js";
import { buildTranscript, describeNow, loadRecentMessages, previewForReply, resolveRef } from "./chatAiContext.js";
import { claimAi, finishAi, readAiState } from "./chatAiState.js";

let lastPollCheckAt = 0;

function isAiAuthor(userId) {
  return userId === AI_USER_ID || userId === "ai-assistant-system";
}

function sanitizeAiMessageText(raw) {
  let text = String(raw || "").trim();
  text = text.replace(/^(IA|ia)\s*:\s*/u, "").trim();
  const chars = [...text];
  if (chars.length > MAX_REPLY_CHARS) {
    text = chars.slice(0, MAX_REPLY_CHARS).join("").trim();
  }
  return text;
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/** Executa o fluxo completo: Claim -> Groq Gate (10 msgs) -> Gemini Writer (30 msgs) -> Persistência. */
export async function runAiEvaluation(env, triggerType = "reply", targetMessageId = null) {
  if (!env?.GEMINI_API_KEY || !env?.GROQ_API_KEY) return;

  const claim = await claimAi(env, {
    kind: triggerType,
    aiMessageId: triggerType === "continue" ? targetMessageId : undefined,
    latestMsgId: triggerType === "reply" ? targetMessageId : undefined
  });
  if (!claim) return;

  let evaluatedLastId = null;
  let finished = false;
  try {
    const isContinue = triggerType === "continue";
    const recent = await loadRecentMessages(env, GEMINI_CONTEXT_MESSAGES);
    if (recent.length === 0) return;

    const now = Date.now();
    const lastMsg = recent[recent.length - 1];
    evaluatedLastId = lastMsg.id;

    if (!isContinue) {
      if (isAiAuthor(lastMsg.userId)) return;
      if (claim.doc.lastEvaluatedMsgId === lastMsg.id) return;
    } else {
      if (lastMsg.id !== targetMessageId || !isAiAuthor(lastMsg.userId)) return;
    }

    // 1. Groq (openai/gpt-oss-120b) analisa até 10 mensagens para decidir se ativa o Gemini
    const groqStartIdx = Math.max(0, recent.length - GROQ_CONTEXT_MESSAGES);
    const groqSlice = recent.slice(groqStartIdx);
    const groqTranscript = buildTranscript(groqSlice, groqStartIdx + 1, now);
    const groqPrompt = isContinue
      ? `Agora: ${describeNow(now)} (Brasília)\n\nÚltimas mensagens do chat:\n${groqTranscript}\n\nA "${AI_USER_NAME}" acabou de enviar a mensagem #${recent.length}. Vale ela enviar uma continuação útil agora?`
      : `Agora: ${describeNow(now)} (Brasília)\n\nÚltimas mensagens do chat:\n${groqTranscript}\n\nAnalise a conversa até a mensagem #${recent.length}. A "${AI_USER_NAME}" deve responder agora?`;

    const gate = await callGroqGate(
      env,
      isContinue ? GROQ_CONTINUE_SYSTEM_PROMPT : GROQ_GATE_SYSTEM_PROMPT,
      groqPrompt
    );
    if (!gate) return;
    if (isContinue ? gate.continuar !== true : gate.responder !== true) return;

    // 2. Gemini (gemini-3.5-flash-lite) lê até 30 mensagens, gera pensamento interno privado e redige a fala
    const fullTranscript = buildTranscript(recent, 1, now);
    let geminiPrompt = `Agora: ${describeNow(now)} (Brasília)\n\nHistórico recente do Chat Global (até ${recent.length} mensagens):\n${fullTranscript}\n\n`;
    if (isContinue) {
      geminiPrompt += `MODO CONTINUAÇÃO: Sua última mensagem foi a #${recent.length} e ninguém respondeu depois. Se houver algo realmente novo e útil para complementar sem repetir o que já falou, escreva em "mensagem". Caso contrário defina "enviar": false.`;
    } else {
      geminiPrompt += `Avalie a conversa até #${recent.length}.`;
      if (gate.alvo) {
        geminiPrompt += ` O filtro sugeriu responder à mensagem ${gate.alvo} (use "responder_a": "${gate.alvo}" apenas se realmente precisar evitar confusão).`;
      }
    }

    const writer = await callGeminiWriter(env, GEMINI_SYSTEM_PROMPT, geminiPrompt);
    if (!writer || writer.enviar !== true) return;

    const finalText = sanitizeAiMessageText(writer.mensagem);
    if (!finalText) return;

    // 3. Resolve citação "respondendo a..." somente se necessária e válida
    const replyCandidate = resolveRef(writer.responder_a, recent);
    const replyTarget = replyCandidate && !isAiAuthor(replyCandidate.userId)
      ? replyCandidate
      : null;

    const aiMessage = {
      id: "ai-" + crypto.randomUUID(),
      userId: AI_USER_ID,
      userName: AI_USER_NAME,
      mediaType: "text",
      text: finalText,
      createdAt: Date.now()
    };

    if (replyTarget) {
      aiMessage.replyToId = replyTarget.id;
      aiMessage.replyToUserName = replyTarget.userName || "Usuário";
      aiMessage.replyToText = previewForReply(replyTarget);
    }

    await saveChatMessage(aiMessage, env);
    await Promise.allSettled([
      bumpUserVersion(CHAT_GLOBAL_SYNC_KEY),
      dispatchChatPushNotifications(aiMessage, env)
    ]);

    finished = true;
    await finishAi(env, claim, { messageId: aiMessage.id, at: aiMessage.createdAt }, aiMessage.id);
  } catch {
    // Falha silenciosa: nunca exibe erros no chat
  } finally {
    if (!finished) {
      await finishAi(env, claim, null, evaluatedLastId);
    }
  }
}

/** Acionado após mensagem de usuário humano (aguarda SETTLE_MS para agrupar mensagens seguidas). */
export async function triggerAiAfterMessage(message, env) {
  try {
    if (!message || isAiAuthor(message.userId) || message.mediaType !== "text") return;
    if (!env?.GEMINI_API_KEY || !env?.GROQ_API_KEY) return;
    await sleep(SETTLE_MS);
    await runAiEvaluation(env, "reply", message.id);
  } catch {
    // Falha silenciosa
  }
}

/** Avalia se a IA deve enviar uma continuação após um tempo da sua última fala. */
export async function maybeContinueAi(env) {
  try {
    if (!env?.GEMINI_API_KEY || !env?.GROQ_API_KEY) return;
    const now = Date.now();
    if (now - lastPollCheckAt < 4000) return;
    lastPollCheckAt = now;

    const { doc } = await readAiState(env);
    if (!doc.lastAiId) return;
    if (doc.contEvaluatedFor === doc.lastAiId) return;
    if ((doc.chain || 0) >= MAX_CONTINUATIONS_IN_ROW) return;
    if ((doc.busyUntil || 0) > now) return;

    const age = now - (doc.lastAiAt || 0);
    if (age < CONTINUE_MIN_AGE_MS || age > CONTINUE_MAX_AGE_MS) return;

    await runAiEvaluation(env, "continue", doc.lastAiId);
  } catch {
    // Falha silenciosa
  }
}
