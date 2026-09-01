export const KNOWLEDGE_BASE = [
  {
    id: "install_app",
    keywords: ["instalar app", "baixar", "abaixar", "abaixar app", "instalação", "pwa", "tela inicial", "app", "aplicativo"],
    title: "Instalar Aplicativo (PWA / APK)",
    location: "Configurações > Instalar App",
    path: "Configurações > Instalar App",
    description: "Permite baixar a versão móvel oficial (.apk) ou instalar como um aplicativo PWA. Existe uma aba dedicada nas Configurações chamada 'Instalar App'.",
    permissions: "Qualquer usuário logado",
    action: { type: "NAVIGATE_TAB", description: "Ir para Configurações > Instalar App", data: { tab: "settings-installApp" } }
  },
  {
    id: "change_pin",
    keywords: ["pin", "trocar pin", "mudar pin", "alterar pin", "redefinir pin", "senha cofre", "mudar senha", "alterar senha"],
    title: "Alterar ou Trocar o PIN do Cofre",
    location: "Configurações > Segurança",
    path: "Configurações > Segurança > Alterar PIN",
    description: "Permite que o usuário redefina a senha de acesso (PIN) do seu cofre protegido. É necessário criar um novo PIN forte para manter a criptografia segura.",
    permissions: "Requer autenticação do usuário e cofre previamente configurado",
    action: { type: "NAVIGATE_TAB", description: "Ir para Configurações de Segurança", data: { tab: "settings-security" } }
  },
  {
    id: "decoy_vault",
    keywords: ["cofre falso", "decoy", "senha falsa", "pin falso", "coação", "esconder fotos", "segundo pin"],
    title: "Cofre Falso (Decoy Vault)",
    location: "Configurações > Cofre Falso",
    path: "Configurações > Cofre Falso",
    description: "Recurso de segurança extrema. O usuário cadastra um PIN secundário. Se for forçado a abrir o app, digita esse PIN falso e uma galeria vazia ou inofensiva é carregada, protegendo os arquivos reais.",
    permissions: "Apenas usuários autenticados",
    action: { type: "NAVIGATE_TAB", description: "Configurar Cofre Falso", data: { tab: "settings-decoyVault" } }
  },
  {
    id: "protected_image",
    keywords: ["imagem protegida", "proteger foto", "senha na foto", "bloquear foto", "ocultar com senha"],
    title: "Imagem Protegida",
    location: "Configurações > Imagem Protegida",
    path: "Configurações > Imagem Protegida",
    description: "Oculte fotos com uma senha de segurança extra, útil para travar imagens específicas dentro do cofre.",
    permissions: "Usuário autenticado",
    action: { type: "NAVIGATE_TAB", description: "Configurar Imagem Protegida", data: { tab: "settings-fakeVault" } }
  },
  {
    id: "chat_seguro",
    keywords: ["chat", "conversa", "amigo", "mensagens", "falar com alguem", "audio", "gravar voz", "foto chat"],
    title: "Chat Seguro Criptografado",
    location: "Aba Chat",
    path: "Menu Inferior > Chat",
    description: "Comunicação segura com outros usuários. Suporta mensagens de texto, envio de imagens do cofre e áudios gravados na hora. O usuário precisa adicionar contatos usando o e-mail ou código de vínculo.",
    permissions: "Usuário deve estar online e autenticado",
    action: { type: "NAVIGATE_TAB", description: "Ir para o Chat Seguro", data: { tab: "chat" } }
  },
  {
    id: "active_sessions",
    keywords: ["sessoes", "sessões", "dispositivos", "aparelhos", "desconectar", "segurança", "remover acesso"],
    title: "Controle de Sessões Ativas",
    location: "Configurações > Controle",
    path: "Configurações > Controle de Sessões",
    description: "Mostra todos os navegadores, celulares e dispositivos conectados à conta do usuário. Permite revogar (desconectar) remotamente qualquer sessão suspeita.",
    permissions: "Usuário autenticado",
    action: { type: "NAVIGATE_TAB", description: "Ir para Controle de Sessões", data: { tab: "settings-control" } }
  },
  {
    id: "storage_management",
    keywords: ["armazenamento", "memória", "espaço", "limpar cache", "mb", "gb", "uso"],
    title: "Gerenciar Armazenamento / Limpar Cache",
    location: "Configurações > Armazenamento",
    path: "Configurações > Armazenamento",
    description: "Monitora o uso do disco no dispositivo local e permite limpar o cache de imagens para liberar espaço. Não apaga arquivos da nuvem, apenas otimiza o navegador.",
    permissions: "Qualquer usuário",
    action: { type: "NAVIGATE_TAB", description: "Ir para Armazenamento", data: { tab: "settings-storage" } }
  },
  {
    id: "vault_repair",
    keywords: ["reparar", "consertar", "bug", "corrompido", "sincronizar", "integridade", "foto nao abre"],
    title: "Reparar Cofre",
    location: "Configurações > Reparar Cofre",
    path: "Configurações > Reparar Cofre",
    description: "Ferramenta de diagnóstico. Tenta recriar o índice do banco de dados local caso alguma foto pare de carregar ou a galeria mostre erros visuais.",
    permissions: "Usuário autenticado",
    action: { type: "NAVIGATE_TAB", description: "Ir para Ferramentas de Reparo", data: { tab: "settings-repair" } }
  },
  {
    id: "account_settings",
    keywords: ["conta", "email", "login", "perfil", "vincular email", "cadastrar senha"],
    title: "Gerenciamento de Conta (Vínculo)",
    location: "Configurações > Conta",
    path: "Configurações > Conta",
    description: "Permite visualizar os dados do perfil e vincular um provedor de login anônimo a um e-mail/senha real, garantindo que o acesso não seja perdido se limpar o navegador.",
    permissions: "Usuário autenticado (pode requerer reautenticação)",
    action: { type: "NAVIGATE_TAB", description: "Ir para Configurações da Conta", data: { tab: "settings-account" } }
  },
  {
    id: "trash_management",
    keywords: ["lixeira", "recuperar", "restaurar", "apagados", "excluidos", "esvaziar lixeira"],
    title: "Lixeira do Sistema",
    location: "Aba Lixeira",
    path: "Menu Inferior > Lixeira",
    description: "Mídias deletadas da Galeria ou Cofre vêm para cá. O usuário pode restaurá-las ou esvaziar a lixeira definitivamente. Arquivos são excluídos automaticamente após 30 dias.",
    permissions: "Qualquer usuário logado",
    action: { type: "NAVIGATE_TAB", description: "Ir para a Lixeira", data: { tab: "trash" } }
  },
  {
    id: "guarly_ai_settings",
    keywords: ["ia", "inteligência", "guarly ai", "configurar ai", "chave api", "cerebras", "gemini", "modelo"],
    title: "Configurações do Guarly AI",
    location: "Configurações > Guarly AI",
    path: "Configurações > Guarly AI",
    description: "Permite ao usuário adicionar uma chave de API própria (Bring Your Own Key) para usar o chat da IA. Pode mudar a URL da API e o modelo de IA que processa as mensagens.",
    permissions: "Usuário logado",
    action: { type: "NAVIGATE_TAB", description: "Ir para Configurações da IA", data: { tab: "settings-ai" } }
  }
];

