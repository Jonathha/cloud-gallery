import { KnowledgeArticle } from "./guarlyTypes";

export const KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: "change_pin",
    keywords: ["pin", "trocar pin", "mudar pin", "alterar pin", "redefinir pin", "senha cofre", "mudar senha", "alterar senha", "redefinir senha", "trocar senha"],
    title: "Alterar ou Trocar o PIN do Cofre",
    content: "Para alterar, trocar ou redefinir o PIN (senha de acesso do cofre protegido), acesse Configurações > Segurança. Lá existe a opção para redefinir o PIN de acesso ao cofre de mídias.",
    action: { type: "NAVIGATE_TAB", description: "Ir para Configurações de Segurança", data: { tab: "settings-security" } }
  },
  {
    id: "terms_of_service",
    keywords: ["termo", "termos", "serviço", "servico", "uso", "politica", "privacidade", "contrato", "regras"],
    title: "Termos de Serviço e Política de Privacidade",
    content: "Os Termos de Serviço do Guarly garantem criptografia local AES-256 no dispositivo do usuário. Nenhuma chave de segurança é enviada a servidores sem proteção. Todas as mídias criptografadas permanecem protegidas no armazenamento em nuvem.",
    action: { type: "NAVIGATE_TAB", description: "Ver Termos de Uso e Política", data: { tab: "settings-about" } }
  },
  {
    id: "fake_vault",
    keywords: ["cofre falso", "decoy", "senha falsa", "pin falso", "senha fake", "pin fake", "coação", "coacao", "esconder fotos"],
    title: "Cofre Falso (Decoy Vault / PIN Falso)",
    content: "O Cofre Falso permite cadastrar um PIN secundário falso para situações de coação. Ao digitar este PIN falso, o aplicativo exibirá uma galeria fake com arquivos inofensivos, mantendo as mídias verdadeiras ocultas. Configure em Configurações > Cofre Falso.",
    action: { type: "NAVIGATE_TAB", description: "Configurar Cofre Falso", data: { tab: "settings-fakeVault" } }
  },
  {
    id: "chat_seguro",
    keywords: ["chat", "conversa", "amigo", "amigos", "mensagen", "mensagens", "falar com alguem", "enviar audio", "enviar foto chat", "gravacao", "gravar voz"],
    title: "Chat Seguro com outros Usuários",
    content: "O Chat Seguro permite adicionar amigos (via e-mail ou código) e trocar mensagens privadas com envio de fotos criptografadas e gravações de áudio de voz. Acesse pela aba 'Chat'.",
    action: { type: "NAVIGATE_TAB", description: "Ir para o Chat Seguro", data: { tab: "chat" } }
  },
  {
    id: "active_sessions",
    keywords: ["sessoes", "sessões", "dispositivos", "aparelhos", "quem ta online", "outros celulares", "desconectar", "segurança conta", "controle"],
    title: "Gerenciar Dispositivos e Sessões Ativas",
    content: "No painel Controle de Sessões, é possível verificar todos os navegadores e dispositivos conectados à sua conta em tempo real e desconectá-los remotamente. Fica em Configurações > Controle.",
    action: { type: "NAVIGATE_TAB", description: "Ir para Controle de Sessões", data: { tab: "settings-control" } }
  },
  {
    id: "storage_management",
    keywords: ["armazenamento", "memoria", "memória", "espaço", "espaco", "tamanho", "limpar cache", "gasto", "mb", "gb"],
    title: "Gerenciar Armazenamento e Limpar Cache",
    content: "Monitore o uso de armazenamento das suas mídias e realize a limpeza do cache de imagens locais no navegador em Configurações > Armazenamento.",
    action: { type: "NAVIGATE_TAB", description: "Ir para Gerenciamento de Armazenamento", data: { tab: "settings-storage" } }
  },
  {
    id: "vault_repair",
    keywords: ["reparar", "consertar", "ajustar", "bug", "erro foto", "nao carrega", "corromp", "sincronizar", "integridade"],
    title: "Ferramenta de Reparo do Cofre e Galeria",
    content: "Se houver falhas de carregamento de fotos ou sincronização de banco de dados, utilize o painel de Reparo em Configurações > Reparar Cofre.",
    action: { type: "NAVIGATE_TAB", description: "Ir para Ferramentas de Reparo", data: { tab: "settings-repair" } }
  },
  {
    id: "account_settings",
    keywords: ["conta", "email", "e-mail", "login", "perfil", "vincular email", "mudar email", "trocar email", "cadastrar senha"],
    title: "Gerenciamento da Conta de Usuário",
    content: "Para gerenciar seu perfil, e-mail cadastrado ou criar vínculo com e-mail e senha, acesse Configurações > Conta.",
    action: { type: "NAVIGATE_TAB", description: "Ir para Configurações da Conta", data: { tab: "settings-account" } }
  },
  {
    id: "backup_drive",
    keywords: ["backup", "nuvem", "sincronizacao", "sincronizar", "exportar", "importar", "restaurar"],
    title: "Backup e Armazenamento em Nuvem",
    content: "O Guarly sincroniza e armazena suas mídias criptografadas com segurança na nuvem. Você pode verificar o uso de armazenamento em Configurações.",
    action: { type: "NAVIGATE_TAB", description: "Ir para Configurações de Armazenamento", data: { tab: "settings-storage" } }
  },
  {
    id: "trash_management",
    keywords: ["lixeira", "recuperar", "restaurar", "restaurar foto", "apagados", "excluidos", "excluídos", "deletados", "esvaziar lixeira"],
    title: "Lixeira e Recuperação de Mídias",
    content: "Fotos e vídeos excluídos ficam armazenados na Lixeira por até 30 dias. Você pode restaurá-los para a galeria ou esvaziar a lixeira em definitivo.",
    action: { type: "NAVIGATE_TAB", description: "Ir para a Lixeira", data: { tab: "trash" } }
  },
  {
    id: "app_about_updates",
    keywords: ["atualizacao", "atualização", "atualizar", "versao", "versão", "sobre", "sistema", "build"],
    title: "Sobre o Aplicativo e Atualizações",
    content: "Consulte a versão instalada, cheque atualizações do aplicativo e leia os detalhes da plataforma em Configurações > Sobre.",
    action: { type: "NAVIGATE_TAB", description: "Ir para Sobre o Aplicativo", data: { tab: "settings-about" } }
  }
];
