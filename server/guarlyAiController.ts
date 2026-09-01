import { Request, Response } from "express";
import { validateBanco1Token } from "./guarly/guarlyAuth";
import { BanInfo } from "./guarly/guarlyTypes";
import { GUARLY_SYSTEM_PROMPT } from "./guarly/guarlyPrompt";
import { findRelevantKnowledge } from "./guarly/guarlyKnowledgeHelpers";
import { getLocalGuarlyAiResponse } from "./guarly/guarlyFallbackEngine";
import { handleResponseBan } from "./guarly/guarlyBanHelper";

const localBanStore = new Map<string, BanInfo>();

const GOOGLE_GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

function isSafePublicHttpsUrl(urlStr: string): boolean {
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

export async function handleGuarlyChat(req: Request, res: Response) {
  try {
    const { messages, customConfig = {}, checkBanOnly = false } = req.body;

    let userUid: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const tokenUser = await validateBanco1Token(authHeader);
        if (tokenUser) {
          userUid = tokenUser.uid as string;
          userEmail = tokenUser.email as string;
        }
      } catch (err) {
        console.warn("[GuarlyAI Controller] Auth token validation failed:", err);
      }
    }

    if (!userUid) {
      return res.status(401).json({
        success: false,
        error: "É necessário estar autenticado com uma conta válida para utilizar o assistente Guarly."
      });
    }

    let activeBanInfo: BanInfo | null = null;
    if (userUid) {
      activeBanInfo = localBanStore.get(`uid_${userUid}`) || null;
    }

    if (activeBanInfo && activeBanInfo.expiresAt > Date.now()) {
      const remainingMs = activeBanInfo.expiresAt - Date.now();
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      const remainingStr = minutes > 0 ? `${minutes} minuto(s) e ${seconds} segundo(s)` : `${seconds} segundo(s)`;

      return res.json({
        success: true, banned: true, banExpiresAt: activeBanInfo.expiresAt, banReason: activeBanInfo.reason,
        response: `Você está temporariamente suspenso do chat do Guarly por mais ${remainingStr}.\nMotivo: ${activeBanInfo.reason}\n\nPor favor, mantenha a educação e aguarde o fim do bloqueio.`
      });
    }

    if (checkBanOnly) return res.json({ success: true, banned: false });
    if (!Array.isArray(messages)) return res.status(400).json({ success: false, error: "Messages array is required." });

    let apiKey: string;
    let apiUrl: string;

    if (customConfig.apiUrl && typeof customConfig.apiUrl === "string" && customConfig.apiUrl.trim() !== "") {
      const candidateUrl = customConfig.apiUrl.trim();
      if (candidateUrl === GOOGLE_GEMINI_ENDPOINT || candidateUrl.startsWith("https://generativelanguage.googleapis.com/")) {
        apiUrl = candidateUrl;
        apiKey = (customConfig.apiKey && typeof customConfig.apiKey === "string" && customConfig.apiKey.trim())
          ? customConfig.apiKey.trim()
          : (process.env.GEMINI_API_KEY || "");
      } else {
        if (!isSafePublicHttpsUrl(candidateUrl)) {
          return res.status(400).json({ success: false, error: "URL da API de IA inválida ou não permitida (deve ser HTTPS público e não interno)." });
        }
        if (!customConfig.apiKey || typeof customConfig.apiKey !== "string" || !customConfig.apiKey.trim()) {
          return res.status(400).json({ success: false, error: "Para utilizar uma URL personalizada de IA, é obrigatório fornecer sua própria chave de API (apiKey)." });
        }
        apiUrl = candidateUrl;
        apiKey = customConfig.apiKey.trim();
      }
    } else {
      apiUrl = GOOGLE_GEMINI_ENDPOINT;
      apiKey = (customConfig.apiKey && typeof customConfig.apiKey === "string" && customConfig.apiKey.trim())
        ? customConfig.apiKey.trim()
        : (process.env.GEMINI_API_KEY || "");
    }

    const model = customConfig.model || "gemini-3.5-flash-lite";
    let dynamicPrompt = customConfig.systemPrompt || GUARLY_SYSTEM_PROMPT;

    let lastUserMsg = "";
    try {
      lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
      const relevantArticles = findRelevantKnowledge(lastUserMsg);
      if (relevantArticles.length > 0) {
        dynamicPrompt += `\n\n[INFORMAÇÕES DE SUPORTE ADICIONAIS DE SUPORTE]: O usuário está perguntando sobre um tema coberto pelos seguintes artigos do manual do app. Use estas instruções exatas para responder o usuário com precisão absoluta, e sugira a respectiva ação [ACTION:...] ao final da sua resposta caso aplicável:`;
        for (const article of relevantArticles) {
          dynamicPrompt += `\n- ${article.title}: ${article.content}\n  Ação recomendada para anexar se necessário: [ACTION:${JSON.stringify(article.action)}]`;
        }
      }
    } catch (e) {
      console.warn("[GuarlyAI Controller] KB injection failed:", e);
    }

    try {
      const formattedMessages = [
        { role: "system", content: dynamicPrompt },
        ...messages.map((msg: any) => ({ role: msg.role === "assistant" ? "assistant" : "user", content: String(msg.content || "") }))
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
          const banResult = handleResponseBan(reply, localBanStore, userUid, userEmail, lastUserMsg);
          return res.json({
            success: true, response: banResult.cleanReply, banned: banResult.newlyBanned,
            banExpiresAt: banResult.banExpiresAt || undefined, banReason: banResult.banReason || undefined
          });
        }
      } else {
        const errText = await aiRes.text();
        if (aiRes.status === 402) return res.json({ success: true, response: `Desculpe, a chave da API está sem créditos (Erro 402 Payment Required). Por favor, vá em Configurações > Guarly AI e adicione uma nova chave com créditos para continuar.` });
        if (aiRes.status === 404) return res.json({ success: true, response: `Desculpe, o modelo '${model}' não foi encontrado na API (Erro 404). Por favor, verifique se o nome do modelo está correto nas Configurações > Guarly AI.` });
        if (aiRes.status === 401 || (aiRes.status === 400 && errText.toLowerCase().includes("key"))) return res.json({ success: true, response: `Desculpe, a chave da API é inválida ou incompatível com a URL (Erro de Autenticação). Por favor, verifique a chave nas Configurações > Guarly AI.` });
        return res.json({ success: true, response: `Ocorreu um erro na API da Inteligência Artificial (Status ${aiRes.status}): ${errText.substring(0, 100)}...` });
      }
    } catch (e) {
      console.warn("[GuarlyAI Controller] AI API call failed:", e);
    }

    const fallbackResponse = getLocalGuarlyAiResponse(messages);
    const banResult = handleResponseBan(fallbackResponse, localBanStore, userUid, userEmail, lastUserMsg);
    return res.json({
      success: true, response: banResult.cleanReply, banned: banResult.newlyBanned,
      banExpiresAt: banResult.banExpiresAt || undefined, banReason: banResult.banReason || undefined
    });
  } catch (err: any) {
    console.error("[GuarlyAI Controller] Exception:", err);
    return res.json({ success: true, response: getLocalGuarlyAiResponse([]) });
  }
}
