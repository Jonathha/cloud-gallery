import {
  GEMINI_ENDPOINT, GEMINI_NATIVE_ENDPOINT, GEMINI_MODEL, GROQ_ENDPOINT, GROQ_MODEL, REQUEST_TIMEOUT_MS
} from "./chatAiConfig.js";

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/** POST JSON com timeout e no máximo 1 retry curto para 429/503 transitórios. */
async function postJson(url, headers, body) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (res.ok) {
        return { status: res.status, data: await res.json().catch(() => null) };
      }
      if ((res.status === 503 || res.status === 429) && attempt === 0) {
        clearTimeout(timer);
        await sleep(600);
        continue;
      }
      return { status: res.status, data: null };
    } catch {
      if (attempt === 0) {
        await sleep(300);
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
  const headers = { "Authorization": `Bearer ${apiKey}` };
  const systemList = Array.isArray(system) ? system.filter(Boolean) : [system].filter(Boolean);
  const messages = [
    ...systemList.map(content => ({ role: "system", content })),
    { role: "user", content: user }
  ];
  let result = await postJson(url, headers, { model, messages, ...full });
  if (result.status === 400) {
    result = await postJson(url, headers, { model, messages, ...minimal });
  }
  const content = result.data?.choices?.[0]?.message?.content;
  if (!content) return null;
  return parseJsonLoose(content);
}

/** Fallback direto para a API nativa do Gemini caso o endpoint OpenAI falhe. */
async function callGeminiNative(apiKey, system, user) {
  const result = await postJson(
    GEMINI_NATIVE_ENDPOINT,
    { "x-goog-api-key": apiKey },
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
        maxOutputTokens: 1500
      }
    }
  );
  const text = result.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return parseJsonLoose(text);
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
      max_completion_tokens: 1200,
      temperature: 0.2
    },
    minimal: { max_completion_tokens: 1200 }
  });
}

/** Gemini (gemini-3.5-flash-lite): pensa internamente e gera a mensagem final (com fallback nativo). */
export async function callGeminiWriter(env, system, user) {
  if (!env?.GEMINI_API_KEY) return null;
  const openAiParsed = await callChatModel({
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
  if (openAiParsed) return openAiParsed;
  return callGeminiNative(env.GEMINI_API_KEY, system, user);
}
