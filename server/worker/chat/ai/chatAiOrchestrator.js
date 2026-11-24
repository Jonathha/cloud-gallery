import { saveChatMessage } from "../../../chatGlobalD1.js";
import { bumpUserVersion } from "../../../userSync.js";
import { CHAT_GLOBAL_SYNC_KEY } from "../chatPushApi.js";
import { dispatchChatPushNotifications } from "../chatWebPush.js";
import {
  AI_USER_ID,
  AI_USER_NAME,
  CONTINUE_MAX_AGE_MS,
  CONTINUE_MIN_AGE_MS,
  FOLLOWUP_MAX_AGE_MS,
  FOLLOWUP_MIN_AGE_MS,
  GEMINI_CONTEXT_MESSAGES,
  GROQ_CONTEXT_MESSAGES,
  MAX_CONTINUATIONS_IN_ROW,
  MAX_FOLLOWUPS_IN_ROW,
  MAX_REPLY_CHARS,
  SETTLE_MS
} from "./chatAiConfig.js";
import {
  GEMINI_SYSTEM_PROMPT,
  GROQ_CONTINUE_SYSTEM_PROMPT,
  GROQ_FOLLOWUP_SYSTEM_PROMPT,
  GROQ_GATE_SYSTEM_PROMPT
} from "./chatAiPrompts.js";
import { callGeminiWriter, callGroqGate } from "./chatAiClients.js";
import { buildTranscript, describeNow, loadRecentMessages, previewForReply, resolveRef } from "./chatAiContext.js";
import { claimAi, finishAi, markPendingMessage, readAiState } from "./chatAiState.js";

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
  if (!env?.GEMINI_API_KEY || !env?.GROQ_API_KEY) return false;

  const claim = await claimAi(env, {
    kind: triggerType,
    aiMessageId: (triggerType === "continue" || triggerType === "followup") ? targetMessageId : undefined,
    latestMsgId: triggerType === "reply" ? targetMessageId : undefined
  });
  if (!claim) return false;

  let evaluatedLastId = null;
  let finished = false;
  try {
    const isContinue = triggerType === "continue";
    const isFollowup = triggerType === "followup";
    const recent = await loadRecentMessages(env, GEMINI_CONTEXT_MESSAGES);
    if (recent.length === 0) return true;

    const now = Date.now();
    const lastMsg = recent[recent.length - 1];
    evaluatedLastId = lastMsg.id;

    if (triggerType === "reply") {
      if (isAiAuthor(lastMsg.userId)) return true;
      if (claim.doc.lastEvaluatedMsgId === lastMsg.id) return true;
    } else {
      if (lastMsg.id !== targetMessageId || !isAiAuthor(lastMsg.userId)) return true;
    }

    // 1. Groq (openai/gpt-oss-120b) analisa até 10 mensagens para decidir se ativa o Gemini
    const groqStartIdx = Math.max(0, recent.length - GROQ_CONTEXT_MESSAGES);
    const groqSlice = recent.slice(groqStartIdx);
    const groqTranscript = buildTranscript(groqSlice, groqStartIdx + 1, now);

    let groqSystem = GROQ_GATE_SYSTEM_PROMPT;
    let groqPrompt = `Agora: ${describeNow(now)} (Brasília)\n\nÚltimas mensagens do chat:\n${groqTranscript}\n\nAnalise a conversa até a mensagem #${recent.length}. A "${AI_USER_NAME}" deve responder ou interagir agora?`;

    if (isContinue) {
      groqSystem = GROQ_CONTINUE_SYSTEM_PROMPT;
      groqPrompt = `Agora: ${describeNow(now)} (Brasília)\n\nÚltimas mensagens do chat:\n${groqTranscript}\n\nA "${AI_USER_NAME}" acabou de enviar a mensagem #${recent.length}. Vale ela enviar uma continuação útil agora?`;
    } else if (isFollowup) {
      groqSystem = GROQ_FOLLOWUP_SYSTEM_PROMPT;
      groqPrompt = `Agora: ${describeNow(now)} (Brasília)\n\nÚltimas mensagens do chat:\n${groqTranscript}\n\nA "${AI_USER_NAME}" enviou a mensagem #${recent.length} há algum tempo. Analise se ela precisa falar novamente agora (corrigir algo, complementar ou retomar algum ponto importante).`;
    }

    const gate = await callGroqGate(env, groqSystem, groqPrompt);
    if (!gate) return true;

    const shouldActivate = isContinue
      ? gate.continuar === true
      : isFollowup
        ? (gate.ativar === true || gate.responder === true || gate.continuar === true)
        : gate.responder === true;
    if (!shouldActivate) return true;

    // 2. Gemini (gemini-3.5-flash-lite) lê até 30 mensagens, gera pensamento interno privado e redige a fala
    const fullTranscript = buildTranscript(recent, 1, now);
    let geminiPrompt = `Agora: ${describeNow(now)} (Brasília)\n\nHistórico recente do Chat Global (até ${recent.length} mensagens):\n${fullTranscript}\n\n`;
    if (isContinue || isFollowup) {
      geminiPrompt += `MODO CONTINUAÇÃO: Sua última mensagem foi a #${recent.length} e ninguém respondeu depois. Analise o que você falou antes e a conversa recente: se houver algo novo, importante para corrigir/esclarecer ou útil para complementar sem repetir o que já disse, escreva em "mensagem". Caso contrário defina "enviar": false.`;
      if (gate.alvo) {
        geminiPrompt += ` O filtro sugeriu mirar na mensagem ${gate.alvo}.`;
      }
    } else {
      geminiPrompt += `Avalie a conversa até #${recent.length}.`;
      if (gate.alvo) {
        geminiPrompt += ` O filtro sugeriu responder à mensagem ${gate.alvo} (use "responder_a": "${gate.alvo}" apenas se realmente precisar evitar confusão).`;
      }
    }

    const writer = await callGeminiWriter(env, GEMINI_SYSTEM_PROMPT, geminiPrompt);
    if (!writer || writer.enviar !== true) return true;

    const finalText = sanitizeAiMessageText(writer.mensagem);
    if (!finalText) return true;

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
    return true;
  } catch {
    return true;
  } finally {
    if (!finished) {
      await finishAi(env, claim, null, evaluatedLastId);
    }
  }
}

/** Acionado após mensagem de usuário humano (aguarda SETTLE_MS e garante fila via pendingMsgId se ocupado). */
export async function triggerAiAfterMessage(message, env) {
  try {
    if (!message || isAiAuthor(message.userId) || message.mediaType !== "text") return;
    if (!env?.GEMINI_API_KEY || !env?.GROQ_API_KEY) return;
    await sleep(SETTLE_MS);
    const claimed = await runAiEvaluation(env, "reply", message.id);
    if (!claimed) {
      await markPendingMessage(env, message.id);
      await sleep(3200);
      await runAiEvaluation(env, "reply", message.id);
    }
  } catch {
    // Falha silenciosa
  }
}

/** Avalia mensagens pendentes, continuação curta ou reativação após alguns minutos. */
export async function maybeContinueAi(env) {
  try {
    if (!env?.GEMINI_API_KEY || !env?.GROQ_API_KEY) return;
    const now = Date.now();
    if (now - lastPollCheckAt < 4000) return;
    lastPollCheckAt = now;

    const { doc } = await readAiState(env);
    if ((doc.busyUntil || 0) > now) return;

    if (doc.pendingMsgId && doc.lastEvaluatedMsgId !== doc.pendingMsgId) {
      await runAiEvaluation(env, "reply", doc.pendingMsgId);
      return;
    }

    if (!doc.lastAiId) return;
    const age = now - (doc.lastAiAt || 0);

    if (
      doc.contEvaluatedFor !== doc.lastAiId &&
      (doc.chain || 0) < MAX_CONTINUATIONS_IN_ROW &&
      age >= CONTINUE_MIN_AGE_MS &&
      age <= CONTINUE_MAX_AGE_MS
    ) {
      await runAiEvaluation(env, "continue", doc.lastAiId);
      return;
    }

    if (
      doc.followupEvaluatedFor !== doc.lastAiId &&
      (doc.followupChain || 0) < MAX_FOLLOWUPS_IN_ROW &&
      age >= FOLLOWUP_MIN_AGE_MS &&
      age <= FOLLOWUP_MAX_AGE_MS
    ) {
      await runAiEvaluation(env, "followup", doc.lastAiId);
    }
  } catch {
    // Falha silenciosa
  }
}
