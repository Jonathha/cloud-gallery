import { KNOWLEDGE_BASE } from "./guarlyKnowledgeBase";
import { KnowledgeArticle } from "./guarlyTypes";

export function findRelevantKnowledge(userMsg: string): KnowledgeArticle[] {
  const msgNormalized = String(userMsg || "").toLowerCase().trim();
  const matched: KnowledgeArticle[] = [];
  for (const item of KNOWLEDGE_BASE) {
    for (const kw of item.keywords) {
      if (msgNormalized.includes(kw)) {
        matched.push(item);
        break;
      }
    }
  }
  return matched;
}

export function isGreetingMessage(msg: string): boolean {
  const cleaned = msg.toLowerCase().replace(/[^a-z0-9áàâãéèêíïóôõöúçñ\s]/g, '').trim();
  if (!cleaned) return true;

  const greetingWords = [
    'oi', 'oii', 'oiii', 'oioii', 'oioi', 'ola', 'olá', 'eai', 'e aii', 'e aí',
    'opa', 'salve', 'fala', 'beleza', 'suave', 'tranquilo', 'tudo bem',
    'tudo bom', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hi', 'hello', 'yo'
  ];

  if (greetingWords.includes(cleaned)) return true;
  if (/^o+i+/i.test(cleaned)) return true;
  if (/^o+l+a+/i.test(cleaned)) return true;
  if (/^e+\s*a+i+/i.test(cleaned)) return true;
  if (cleaned.length <= 6 && (cleaned.startsWith('oi') || cleaned.startsWith('ola') || cleaned.startsWith('eai') || cleaned.startsWith('opa'))) return true;

  return false;
}
