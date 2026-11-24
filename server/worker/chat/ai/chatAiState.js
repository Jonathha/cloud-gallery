import { d1Query, ensureChatGlobalSchema } from "../../../chatGlobalD1.js";
import {
  BUSY_LOCK_MS,
  MAX_AI_MESSAGES_PER_HOUR,
  MAX_CONTINUATIONS_IN_ROW,
  MAX_FOLLOWUPS_IN_ROW,
  MIN_GAP_BETWEEN_AI_MS
} from "./chatAiConfig.js";

const DATASET = "IaEstado";

export async function readAiState(env) {
  await ensureChatGlobalSchema(env);
  const result = await d1Query(
    "SELECT data, updated_at FROM chat_global_json_chunks WHERE dataset = ? AND chunk_index = 0",
    [DATASET],
    env
  );
  const row = result.results?.[0];
  if (!row) return { doc: {}, updatedAt: null };
  try {
    const parsed = JSON.parse(row.data || "[]");
    return { doc: (Array.isArray(parsed) ? parsed[0] : parsed) || {}, updatedAt: row.updated_at };
  } catch {
    return { doc: {}, updatedAt: row.updated_at };
  }
}

async function writeAiState(env, doc, prevUpdatedAt) {
  const json = JSON.stringify([doc]);
  const bytes = new TextEncoder().encode(json).byteLength;
  const nextUpdatedAt = Math.max(Date.now(), (prevUpdatedAt || 0) + 1);
  let res;
  if (prevUpdatedAt === null) {
    res = await d1Query(
      "INSERT OR IGNORE INTO chat_global_json_chunks (dataset, chunk_index, data, size_bytes, version, updated_at) VALUES (?, 0, ?, ?, 1, ?)",
      [DATASET, json, bytes, nextUpdatedAt],
      env
    );
  } else {
    res = await d1Query(
      "UPDATE chat_global_json_chunks SET data = ?, size_bytes = ?, updated_at = ? WHERE dataset = ? AND chunk_index = 0 AND updated_at = ?",
      [json, bytes, nextUpdatedAt, DATASET, prevUpdatedAt],
      env
    );
  }
  return { ok: (res.meta?.changes || 0) > 0, updatedAt: nextUpdatedAt };
}

/** Registra uma mensagem humana pendente quando a IA estava ocupada no momento do envio. */
export async function markPendingMessage(env, messageId) {
  if (!messageId) return;
  try {
    const { doc, updatedAt } = await readAiState(env);
    if (doc.lastEvaluatedMsgId === messageId || doc.pendingMsgId === messageId) return;
    await writeAiState(env, { ...doc, pendingMsgId: messageId }, updatedAt);
  } catch {
    // Silencioso
  }
}

/** Reserva atomicamente a execução da IA usando concorrência otimista. */
export async function claimAi(env, { kind, aiMessageId, latestMsgId } = {}) {
  const now = Date.now();
  const { doc, updatedAt } = await readAiState(env);

  if ((doc.busyUntil || 0) > now) return null;
  if (now - (doc.lastAiAt || 0) < MIN_GAP_BETWEEN_AI_MS) return null;
  const sentLastHour = (doc.sentAt || []).filter(t => now - t < 3_600_000);
  if (sentLastHour.length >= MAX_AI_MESSAGES_PER_HOUR) return null;

  if (kind === "reply" && latestMsgId && doc.lastEvaluatedMsgId === latestMsgId) {
    return null;
  }

  const next = { ...doc, sentAt: sentLastHour, busyUntil: now + BUSY_LOCK_MS };
  if (kind === "reply") {
    if (doc.pendingMsgId && (!latestMsgId || doc.pendingMsgId === latestMsgId)) {
      next.pendingMsgId = null;
    }
  } else if (kind === "continue") {
    if (!aiMessageId || doc.lastAiId !== aiMessageId) return null;
    if (doc.contEvaluatedFor === aiMessageId) return null;
    if ((doc.chain || 0) >= MAX_CONTINUATIONS_IN_ROW) return null;
    next.contEvaluatedFor = aiMessageId;
  } else if (kind === "followup") {
    if (!aiMessageId || doc.lastAiId !== aiMessageId) return null;
    if (doc.followupEvaluatedFor === aiMessageId) return null;
    if ((doc.followupChain || 0) >= MAX_FOLLOWUPS_IN_ROW) return null;
    next.followupEvaluatedFor = aiMessageId;
  }

  const written = await writeAiState(env, next, updatedAt);
  if (!written.ok) return null;
  return { kind, doc: next, updatedAt: written.updatedAt };
}

function applyFinishFields(baseDoc, claimKind, sent, evaluatedMsgId) {
  const next = { ...baseDoc, busyUntil: 0 };
  if (evaluatedMsgId) {
    next.lastEvaluatedMsgId = evaluatedMsgId;
    if (next.pendingMsgId === evaluatedMsgId) {
      next.pendingMsgId = null;
    }
  }
  if (sent) {
    next.lastAiAt = sent.at;
    next.lastAiId = sent.messageId;
    next.lastEvaluatedMsgId = sent.messageId;
    if (next.pendingMsgId === sent.messageId) {
      next.pendingMsgId = null;
    }
    next.sentAt = [...(baseDoc.sentAt || []), sent.at];
    next.chain = claimKind === "continue" ? (baseDoc.chain || 0) + 1 : 0;
    next.followupChain = claimKind === "followup" ? (baseDoc.followupChain || 0) + 1 : 0;
  }
  return next;
}

/** Libera a trava e atualiza o estado da IA após a avaliação (reconciliando conflito de pendingMsgId). */
export async function finishAi(env, claim, sent, evaluatedMsgId = null) {
  try {
    const next = applyFinishFields(claim.doc, claim.kind, sent, evaluatedMsgId);
    const written = await writeAiState(env, next, claim.updatedAt);
    if (written.ok) return;

    // Se markPendingMessage atualizou a linha durante a execução, reconcilia preservando pendingMsgId
    const fresh = await readAiState(env);
    const merged = applyFinishFields(
      { ...claim.doc, pendingMsgId: fresh.doc?.pendingMsgId ?? claim.doc.pendingMsgId },
      claim.kind,
      sent,
      evaluatedMsgId
    );
    if (fresh.doc?.pendingMsgId && fresh.doc.pendingMsgId !== evaluatedMsgId && fresh.doc.pendingMsgId !== sent?.messageId) {
      merged.pendingMsgId = fresh.doc.pendingMsgId;
    }
    await writeAiState(env, merged, fresh.updatedAt);
  } catch {
    // Trava expira automaticamente pelo BUSY_LOCK_MS
  }
}
