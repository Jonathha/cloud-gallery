import { jsonResponse } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChatAuth.js";
import { GUARLY_SYSTEM_PROMPT } from "./workerGuarly/guarlyPrompt.js";
import { findRelevantKnowledge } from "./workerGuarly/guarlyKnowledgeHelpers.js";
import { getLocalGuarlyAiResponse } from "./workerGuarly/guarlyFallbackEngine.js";
import { getBanInfo, handleResponseBanWorker } from "./workerGuarly/guarlyBanStore.js";

const DEFAULT_API_KEY = "";
const GOOGLE_GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

function isSafePublicHttpsUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host.startsWith("fc00:") ||
      host.startsWith("fe80:")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function handleGuarlyChatWorker(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const { messages, customConfig = {}, checkBanOnly = false } = body;

    let userUid = null;
    let userEmail = null;

    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const tokenUser = await validateBanco1Token(authHeader);
        if (tokenUser) {
          userUid = tokenUser.uid;
          userEmail = tokenUser.email;
        }
      } catch (err) {
        console.warn("[GuarlyAI Worker] Auth token validation failed:", err);
      }
    }

    if (!userUid) {
      return jsonResponse({
        success: false,
        error: "É necessário estar autenticado com uma conta válida para utilizar o assistente Guarly."
      }, 401);
    }

    let activeBanInfo = null;
    if (userUid) {
      activeBanInfo = await getBanInfo(`uid_${userUid}`, env);
    }
    if (activeBanInfo && activeBanInfo.expiresAt > Date.now()) {
      const remainingMs = activeBanInfo.expiresAt - Date.now();
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      const remainingStr = minutes > 0 ? `${minutes} minuto(s) e ${seconds} segundo(s)` : `${seconds} segundo(s)`;
      return jsonResponse({
        success: true, banned: true, banExpiresAt: activeBanInfo.expiresAt, banReason: activeBanInfo.reason,
        response: `Você está temporariamente suspenso do chat do Guarly por mais ${remainingStr}.\nMotivo: ${activeBanInfo.reason}\n\nPor favor, mantenha a educação e aguarde o fim do bloqueio.`
      });
    }

    if (checkBanOnly) return jsonResponse({ success: true, banned: false });

    if (!Array.isArray(messages)) return jsonResponse({ success: false, error: "Messages array is required." }, 400);

    let apiKey;
    let apiUrl;

    if (customConfig.apiUrl && typeof customConfig.apiUrl === "string" && customConfig.apiUrl.trim() !== "") {
      const candidateUrl = customConfig.apiUrl.trim();
      if (candidateUrl === GOOGLE_GEMINI_ENDPOINT || candidateUrl.startsWith("https://generativelanguage.googleapis.com/")) {
        apiUrl = candidateUrl;
        apiKey = (customConfig.apiKey && typeof customConfig.apiKey === "string" && customConfig.apiKey.trim())
          ? customConfig.apiKey.trim()
          : ((env && env.GEMINI_API_KEY) || DEFAULT_API_KEY);
      } else {
        if (!isSafePublicHttpsUrl(candidateUrl)) {
          return jsonResponse({ success: false, error: "URL da API de IA inválida ou não permitida (deve ser HTTPS público e não interno)." }, 400);
        }
        if (!customConfig.apiKey || typeof customConfig.apiKey !== "string" || !customConfig.apiKey.trim()) {
          return jsonResponse({ success: false, error: "Para utilizar uma URL personalizada de IA, é obrigatório fornecer sua própria chave de API (apiKey)." }, 400);
        }
        apiUrl = candidateUrl;
        apiKey = customConfig.apiKey.trim();
      }
    } else {
      apiUrl = GOOGLE_GEMINI_ENDPOINT;
      apiKey = (customConfig.apiKey && typeof customConfig.apiKey === "string" && customConfig.apiKey.trim())
        ? customConfig.apiKey.trim()
        : ((env && env.GEMINI_API_KEY) || DEFAULT_API_KEY);
    }

    const model = customConfig.model || "gemini-3.5-flash-lite";
    let dynamicPrompt = customConfig.systemPrompt || GUARLY_SYSTEM_PROMPT;
    let lastUserMsg = "";
    try {
      lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
      const relevantArticles = findRelevantKnowledge(lastUserMsg);
      if (relevantArticles.length > 0) {
        dynamicPrompt += `\n\n[INFORMAÇÕES DE SUPORTE ADICIONAIS DE SUPORTE]: O usuário está perguntando sobre um tema coberto pelos seguintes arquivos do manual do app. Use estas instruções exatas para responder o usuário com precisão absoluta, e sugira a respectiva ação [ACTION:...] ao final da sua resposta caso aplicável:`;
        for (const article of relevantArticles) {
          dynamicPrompt += `\n\n- Funcionalidade: ${article.title}`;
          dynamicPrompt += `\n  Descrição: ${article.description}`;
          dynamicPrompt += `\n  Local na Interface: ${article.location}`;
          dynamicPrompt += `\n  Caminho Exato: ${article.path}`;
          dynamicPrompt += `\n  Permissões: ${article.permissions}`;
          if (article.action) {
             dynamicPrompt += `\n  Ação recomendada para anexar se necessário: [ACTION:${JSON.stringify(article.action)}]`;
          }
        }
      }
    } catch (e) {
      console.warn("[GuarlyAI Worker] KB injection failed:", e);
    }

    try {
      const formattedMessages = [
        { role: "system", content: dynamicPrompt },
        ...messages.map((msg) => ({ role: msg.role === "assistant" ? "assistant" : "user", content: String(msg.content || "") }))
      ];

      const aiRes = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey.trim()}` },
        body: JSON.stringify({ model, messages: formattedMessages, temperature: 0.6, max_tokens: 1024 })
      });

      if (aiRes.ok) {
        const data = await aiRes.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          const banRes = await handleResponseBanWorker(reply, userUid, userEmail, env, lastUserMsg);
          return jsonResponse({
            success: true, response: banRes.cleanReply, banned: banRes.newlyBanned,
            banExpiresAt: banRes.banExpiresAt || undefined, banReason: banRes.banReason || undefined
          });
        }
      } else {
        const errText = await aiRes.text();
        if (aiRes.status === 402) return jsonResponse({ success: true, response: `Desculpe, a chave da API está sem créditos (Erro 402 Payment Required). Por favor, vá em Configurações > Guarly AI e adicione uma nova chave com créditos para continuar.` });
        if (aiRes.status === 404) return jsonResponse({ success: true, response: `Desculpe, o modelo '${model}' não foi encontrado na API (Erro 404). Por favor, verifique se o nome do modelo está correto nas Configurações > Guarly AI.` });
        if (aiRes.status === 401 || (aiRes.status === 400 && errText.toLowerCase().includes("key"))) return jsonResponse({ success: true, response: `Desculpe, a chave da API é inválida ou incompatível com a URL (Erro de Autenticação). Por favor, verifique a chave nas Configurações > Guarly AI.` });
        return jsonResponse({ success: true, response: `Ocorreu um erro na API da Inteligência Artificial (Status ${aiRes.status}): ${errText.substring(0, 100)}...` });
      }
    } catch (e) {
      console.warn("[GuarlyAI Worker] AI API call failed:", e);
    }

    const fallbackResponse = getLocalGuarlyAiResponse(messages);
    const banRes = await handleResponseBanWorker(fallbackResponse, userUid, userEmail, env, lastUserMsg);
    return jsonResponse({
      success: true, response: banRes.cleanReply, banned: banRes.newlyBanned,
      banExpiresAt: banRes.banExpiresAt || undefined, banReason: banRes.banReason || undefined
    });
  } catch (err) {
    console.error("[GuarlyAI Worker] Exception:", err);
    return jsonResponse({ success: true, response: getLocalGuarlyAiResponse([]) });
  }
}
