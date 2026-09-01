import { findRelevantKnowledge, isGreetingMessage } from "./guarlyKnowledgeHelpers";

export function getLocalGuarlyAiResponse(messages: any[]): string {
  const lastUserMsg = (
    Array.isArray(messages)
      ? [...messages].reverse().find((m: any) => m.role === "user")?.content
      : String(messages || "")
  ) || "";

  const msg = lastUserMsg.toLowerCase().trim();

  // Check if user message is a simple greeting
  if (isGreetingMessage(msg)) {
    const greetings = [
      "Olá! Tudo bem? Como posso te ajudar na sua galeria ou no cofre hoje?",
      "Oi! Como posso te auxiliar com suas fotos, cofre protegido ou armazenamento agora?",
      "Oi! Tudo ótimo por aqui. Precisa de ajuda com alguma foto, cofre ou lixeira?",
      "Olá! Como posso te ajudar hoje no aplicativo Guarly?"
    ];
    const idx = Math.abs(msg.length + (messages ? messages.length : 0)) % greetings.length;
    return greetings[idx];
  }

  // Look up in the Knowledge Base first!
  const matchedArticles = findRelevantKnowledge(msg);
  if (matchedArticles.length > 0) {
    const article = matchedArticles[0];
    let responseText = "";
    if (article.id === "change_pin") {
      responseText = `Para trocar, redefinir ou alterar o seu PIN (senha de acesso ao cofre protegido), acesse as Configurações e vá na aba de "Segurança".\n\nClique no botão abaixo para ser direcionado diretamente para as Configurações de Segurança:`;
    } else if (article.id === "terms_of_service") {
      responseText = `Os Termos de Serviço e Política de Privacidade do Guarly asseguram que todas as suas fotos e dados são criptografados de forma local no seu próprio aparelho (AES-256). Nós não temos acesso a nenhuma informação ou chave sua.\n\nPara visualizar o documento de Termos e Políticas do aplicativo, clique no botão abaixo:`;
    } else if (article.id === "fake_vault") {
      responseText = `O recurso de Cofre Falso permite que você crie um PIN secundário falso para proteção em situações de coação. Ao digitá-lo, o app abrirá uma galeria secreta fake com mídias inofensivas.\n\nClique no botão abaixo para configurar o seu Cofre Falso:`;
    } else if (article.id === "chat_seguro") {
      responseText = `O Guarly possui um Chat Seguro integrado para adicionar contatos (usando e-mail ou código de usuário) e conversar com total privacidade, suportando mensagens de texto, mídias criptografadas e gravação de áudios.\n\nClique abaixo para abrir o Chat Seguro:`;
    } else if (article.id === "active_sessions") {
      responseText = `Você pode monitorar os aparelhos e sessões ativas conectadas à sua conta em tempo real, permitindo desconectar qualquer dispositivo de forma remota em caso de suspeita.\n\nClique abaixo para acessar o Controle de Sessões:`;
    } else if (article.id === "storage_management") {
      responseText = `Você pode verificar o consumo de memória das suas mídias e realizar a limpeza do cache local para liberar espaço físico no seu dispositivo.\n\nClique abaixo para abrir o Gerenciamento de Armazenamento:`;
    } else if (article.id === "vault_repair") {
      responseText = `Caso suas imagens não carreguem ou encontre algum problema com o cofre, você pode utilizar o painel de Reparo para reconstruir o banco de dados local.\n\nClique abaixo para acessar as ferramentas de Reparo:`;
    } else if (article.id === "account_settings") {
      responseText = `Para gerenciar seu perfil, e-mail cadastrado e opções de acesso da sua conta, acesse as Configurações de Conta.\n\nClique abaixo para abrir as Configurações da Conta:`;
    } else if (article.id === "backup_drive") {
      responseText = `Seus arquivos são salvos com segurança e criptografia na nuvem. Acesse a aba de Armazenamento para gerenciar os dados.\n\nClique abaixo para abrir o painel de Armazenamento:`;
    } else if (article.id === "trash_management") {
      responseText = `Os arquivos excluídos permanecem salvos na Lixeira por até 30 dias. Você pode restaurá-los para a galeria ou excluí-los em definitivo.\n\nClique abaixo para abrir a Lixeira:`;
    } else if (article.id === "app_about_updates") {
      responseText = `Você pode consultar os detalhes da versão instalada e checar por atualizações do aplicativo na seção Sobre.\n\nClique abaixo para abrir Sobre o Aplicativo:`;
    }

    if (responseText) {
      return `${responseText}\n\n[ACTION:${JSON.stringify(article.action)}]`;
    }
  }

  // 1. Cache / Liberar espaço / Memória / Limpar
  if (
    msg.includes("cache") || msg.includes("liberar espaço") || msg.includes("liberar espaco") ||
    msg.includes("limpar cache") || msg.includes("memória") || msg.includes("memoria") ||
    (msg.includes("limpar") && !msg.includes("lixeira"))
  ) {
    return `Claro, posso ajudar a limpar o cache local de imagens no seu navegador para liberar memória. Isso não afeta nenhuma foto ou vídeo na nuvem.\n\nConfirme a limpeza clicando no botão abaixo:\n\n[ACTION:{"type":"CLEAR_CACHE","description":"Limpar o cache local de imagens no navegador","data":{}}]`;
  }

  // 2. Lixeira / Apagar / Excluir / Deletar / Esvaziar
  if (msg.includes("lixeira") || msg.includes("excluir") || msg.includes("apagar") || msg.includes("deletar") || msg.includes("esvaziar")) {
    return `Os arquivos excluídos ficam na Lixeira do Guarly por até 30 dias antes de serem apagados definitivamente.\n\nDeseja esvaziar a lixeira agora para liberar espaço? Confirme abaixo:\n\n[ACTION:{"type":"CLEAR_TRASH","description":"Esvaziar permanentemente todos os arquivos da lixeira","data":{}}]`;
  }

  // 3. Cofre / PIN / Senha / Protegido
  if (msg.includes("cofre") || msg.includes("pin") || msg.includes("senha") || msg.includes("protegid") || msg.includes("esqueci")) {
    return `O Cofre Protegido mantém suas mídias privadas e confidenciais sob uma senha secundária e criptografia local AES-256.\n\nPara acessar ou configurar seu Cofre, clique abaixo:\n\n[ACTION:{"type":"NAVIGATE_TAB","description":"Navegar para a aba do Cofre Protegido","data":{"tab":"vault"}}]`;
  }

  // 4. Compartilhamento / Links / Expira / Enviar
  if (msg.includes("compartilh") || msg.includes("link") || msg.includes("enviar foto") || msg.includes("enviar video") || msg.includes("enviar vídeo") || msg.includes("expira")) {
    return `Você pode compartilhar seus arquivos gerando links temporários seguros e customizáveis (de 1 hora a 7 dias).\n\nDeseja escolher um arquivo na sua galeria para compartilhar agora? Clique no botão abaixo:\n\n[ACTION:{"type":"NAVIGATE_TAB","description":"Ir para a Galeria para compartilhar","data":{"tab":"gallery"}}]`;
  }

  // 5. Backup / Configurações / Sincronizar
  if (msg.includes("backup") || msg.includes("nuvem") || msg.includes("sincroniz") || msg.includes("configuraç")) {
    return `Os seus dados são salvos com segurança na nuvem.\n\nPara verificar suas configurações de armazenamento, clique abaixo:\n\n[ACTION:{"type":"NAVIGATE_TAB","description":"Ir para Configurações de Armazenamento","data":{"tab":"settings-storage"}}]`;
  }

  // Chat
  if (msg.includes("chat") || msg.includes("conversa") || msg.includes("mensagen") || msg.includes("amigo")) {
    return `O Guarly possui um Chat Seguro onde você pode adicionar amigos e conversar enviando fotos e áudios com privacidade.\n\nDeseja abrir o Chat agora?\n\n[ACTION:{"type":"NAVIGATE_TAB","description":"Ir para o Chat Seguro","data":{"tab":"chat"}}]`;
  }

  // 6. Galeria / Fotos / Vídeos
  if (msg.includes("galeria") || msg.includes("foto") || msg.includes("vídeo") || msg.includes("video") || msg.includes("mídia") || msg.includes("midia")) {
    return `A sua Galeria Principal armazena e organiza suas mídias com criptografia em tempo real no cliente.\n\nDeseja ir para a Galeria agora? Confirme abaixo:\n\n[ACTION:{"type":"NAVIGATE_TAB","description":"Ir para a Galeria Principal","data":{"tab":"gallery"}}]`;
  }

  // 7. Criptografia / Segurança / Privacidade / AES
  if (msg.includes("criptogr") || msg.includes("seguran") || msg.includes("privacid") || msg.includes("chave") || msg.includes("aes")) {
    return `No Guarly, sua privacidade é prioridade máxima. Suas chaves de segurança são criptografadas localmente com AES-256 e suas fotos nunca são enviadas ou lidas sem proteção.\n\nComo posso te ajudar com mais informações sobre segurança e chaves?`;
  }

  return `Claro! Como posso te ajudar com as funções do Guarly hoje? Posso te levar para a Galeria, Cofre Protegido, Lixeira ou Configurações de Backup.`;
}
