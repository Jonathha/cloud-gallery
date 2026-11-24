import { saveChatMessage, readChunks } from "../../chatGlobalD1.js";
import { bumpUserVersion } from "../../userSync.js";
import { CHAT_GLOBAL_SYNC_KEY } from "./chatPushApi.js";
import { dispatchChatPushNotifications } from "./chatWebPush.js";

export async function maybeTriggerAiAssistant(newMessage, env, ctx) {
  const task = (async () => {
    try {
      if (!newMessage || newMessage.userId === "ai-assistant-system" || newMessage.userName === "IA") {
        return;
      }

      const geminiKey = env?.GEMINI_API_KEY;
      const groqKey = env?.GROQ_API_KEY;
      if (!geminiKey || !groqKey) return;

      const chunks = await readChunks("Mensagem", env);
      const allMessages = chunks.flatMap(c => c.items).filter(Boolean);
      allMessages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const recent30 = allMessages.slice(-30);
      const recent10ForGroq = recent30.slice(-10);

      const historyPrompt = recent10ForGroq.map(m => `${m.userName} (${new Date(m.createdAt).toLocaleTimeString()}): ${m.decryptedText || m.text || '[mídia]'}`).join("\n");

      // 1. Groq analysis (GPT 120 role)
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "Você é o GPT 120, um avaliador cirúrgico de conversas em chat. Analise as últimas mensagens do chat global. Decida se a IA assistente 'IA' deve responder neste momento. A IA SÓ deve responder se houver uma pergunta direta, uma dúvida técnica/geral, um pedido de ajuda, ou um tópico extremamente interessante/relevante na conversa. NUNCA responda a conversas aleatórias, saudações simples ou mensagens vazias. Responda estritamente em JSON válido no formato: {\"shouldRespond\": boolean}."
            },
            {
              role: "user",
              content: `Histórico recente:\n${historyPrompt}\n\nA última mensagem foi de ${newMessage.userName}: "${newMessage.decryptedText || newMessage.text || '[mídia]'}". Devemos acionar a IA?`
            }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (!groqRes.ok) return;
      const groqData = await groqRes.json();
      const decisionText = groqData.choices?.[0]?.message?.content;
      if (!decisionText) return;

      let decision = {};
      try { decision = JSON.parse(decisionText); } catch { return; }

      if (!decision.shouldRespond) return;

      // 2. Gemini generation (Gemini 3.5 Flash / Flash Lite)
      const fullHistory = recent30.map(m => `${m.userName} [${new Date(m.createdAt).toLocaleTimeString()}]: ${m.decryptedText || m.text || '[mídia]'}`).join("\n");

      const geminiPrompt = `Você é a IA, o assistente oficial do Chat Global. 
Você possui um selo de verificado no seu nome. 
Você é amigável, extremamente prestativa, inteligente e responde com precisão cirúrgica e sem erros.
Você conhece o nome de cada usuário e o horário de envio de cada mensagem.
Diretrizes:
1. Gere primeiro um pensamento interno detalhado (internalThought) analisando o contexto, a intenção da pergunta e a resposta exata. O pensamento interno é privado e não aparece para os usuários.
2. Após o pensamento, elabore a resposta final para o chat (reply).
3. A resposta deve ser curta, fluida, natural e humana. Não use frases robóticas como "foi mal" ou preâmbulos longos. Vá direto ao ponto de forma cirúrgica.
4. Se for necessário direcionar a resposta a um usuário específico, inicie com "respondendo a [Nome]: " apenas se necessário para evitar confusão.
5. Retorne a resposta estritamente em JSON válido no formato: {"internalThought": "...", "reply": "..."}.

Histórico do Chat (últimas 30 mensagens):
${fullHistory}

Última mensagem enviada por ${newMessage.userName}: "${newMessage.decryptedText || newMessage.text || '[mídia]'}".`;

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
        })
      });

      if (!geminiRes.ok) return;
      const geminiData = await geminiRes.json();
      const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawOutput) return;

      let parsedAi = {};
      try { parsedAi = JSON.parse(rawOutput); } catch { return; }
      const replyText = parsedAi.reply?.trim();
      if (!replyText) return;

      const aiMessage = {
        id: "ai-" + crypto.randomUUID(),
        userId: "ai-assistant-system",
        userName: "IA",
        mediaType: "text",
        text: replyText,
        createdAt: Date.now()
      };

      await saveChatMessage(aiMessage, env);
      await bumpUserVersion(CHAT_GLOBAL_SYNC_KEY);
      await dispatchChatPushNotifications(aiMessage, env).catch(() => {});
    } catch {
      // Fail silently on any model or API error
    }
  })();

  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(task);
  } else {
    await task;
  }
}
