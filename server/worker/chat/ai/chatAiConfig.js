// Configuração da IA do Chat Global.
// As chaves ficam exclusivamente nos secrets do Cloudflare Worker (GEMINI_API_KEY e GROQ_API_KEY).

export const AI_USER_ID = "ia-assistant";
export const AI_USER_NAME = "IA";

// Modelos oficiais
export const GEMINI_MODEL = "gemini-3.5-flash-lite";
export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
export const GROQ_MODEL = "openai/gpt-oss-120b";
export const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Janela de contexto
export const GEMINI_CONTEXT_MESSAGES = 30;
export const GROQ_CONTEXT_MESSAGES = 10;
export const MAX_CONTEXT_CHARS_PER_MESSAGE = 600;

// Cadência e proteção contra loop/flood
export const SETTLE_MS = 1500;
export const MIN_GAP_BETWEEN_AI_MS = 3_000;
export const MAX_AI_MESSAGES_PER_HOUR = 40;
export const BUSY_LOCK_MS = 45_000;
export const REQUEST_TIMEOUT_MS = 9_000;

// Sistema de continuação (avaliado pelo Groq após a IA falar)
export const CONTINUE_MIN_AGE_MS = 15_000;
export const CONTINUE_MAX_AGE_MS = 3 * 60_000;
export const MAX_CONTINUATIONS_IN_ROW = 1;

export const MAX_REPLY_CHARS = 700;
export const CHAT_TIMEZONE = "America/Sao_Paulo";
