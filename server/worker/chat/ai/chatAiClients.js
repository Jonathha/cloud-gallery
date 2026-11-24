import {
  GEMINI_ENDPOINT, GEMINI_MODEL, GROQ_ENDPOINT, GROQ_MODEL, REQUEST_TIMEOUT_MS
} from "./chatAiConfig.js";

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/** POST JSON com timeout e até 2 retries curtos para 429/503 transitórios. */
async function postJson(url, apiKey, body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (res.ok) {
        return { status: res.status, data: await res.json().catch(() => null) };
      }
      if ((res.status === 503 || res.status === 429) && attempt < 2) {
        clearTimeout(timer);
        await sleep(600 * (attempt + 1));
        continue;
      }
      return { status: res.status, data: null };
    } catch {
      if (attempt < 2) {
        await sleep(400);
        continue;
      }
      return { status: 0, data: null };
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: 0, data: null };
}

/** Extrai objeto JSON mesmo se vier cercado por blocos ```json. */
export function parseJsonLoose(text) {
  if (typeof text !== "string") return null;
  const cleaned = text.replace(/```json|```/gi, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fallback por recorte */ }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

async function callChatModel({ url, apiKey, model, system, user, full, minimal }) {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
  let result = await postJson(url, apiKey, { model, messages, ...full });
  if (result.status === 400) {
    result = await postJson(url, apiKey, { model, messages, ...minimal });
  }
  const content = result.data?.choices?.[0]?.message?.content;
  if (!content) return null;
  return parseJsonLoose(content);
}

/** Groq (openai/gpt-oss-120b): apenas analisa o contexto e decide se ativa/continua. */
export function callGroqGate(env, system, user) {
  if (!env?.GROQ_API_KEY) return Promise.resolve(null);
  return callChatModel({
    url: GROQ_ENDPOINT,
    apiKey: env.GROQ_API_KEY,
    model: GROQ_MODEL,
    system,
    user,
    full: {
      response_format: { type: "json_object" },
      reasoning_effort: "low",
      include_reasoning: false,
      max_completion_tokens: 800,
      temperature: 0.2
    },
    minimal: { max_completion_tokens: 800 }
  });
}

/** Gemini (gemini-3.5-flash-lite): pensa internamente e gera a mensagem final. */
export function callGeminiWriter(env, system, user) {
  if (!env?.GEMINI_API_KEY) return Promise.resolve(null);
  return callChatModel({
    url: GEMINI_ENDPOINT,
    apiKey: env.GEMINI_API_KEY,
    model: GEMINI_MODEL,
    system,
    user,
    full: {
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.4
    },
    minimal: { max_tokens: 1500 }
  });
}
