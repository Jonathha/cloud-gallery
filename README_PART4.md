# Guarly — Frontend React 19, Componentes de UI & Hooks

> **Documentação Técnica Oficial do Repositório (Parte 4 de 9)**  
> 🔗 **Navegação rápida entre as partes:**  
> - [Parte 1 (README.md)](./README.md) (Visão geral, arquitetura zero-knowledge, mapa de diretórios raiz e ciclo de vida)  
> - [Parte 2 (README_PART2.md)](./README_PART2.md) (Servidor Express, Cloudflare Worker, catálogo de rotas da API e ZeroThreat)  
> - [Parte 3 (README_PART3.md)](./README_PART3.md) (Esquema relacional D1, buckets R2, espelhamento B2 e criptografia base)  
> - [Parte 4 (README_PART4.md)](./README_PART4.md) (Arquitetura React 19, componentes visuais, hooks reativos e cache IndexedDB)  
> - [Parte 5 (README_PART5.md)](./README_PART5.md) (Chat global com áudio WAV, Guarly AI, .env e scripts de deploy)  
> - [Parte 6 (README_PART6.md)](./README_PART6.md) (Motor de Abuse Protection, Turnstile, Durable Objects e detecção de sondagens)  
> - [Parte 7 (README_PART7.md)](./README_PART7.md) (Dicionário de arquivos do backend Node/Worker: Vault, Storage, Shares e D1)  
> - [Parte 8 (README_PART8.md)](./README_PART8.md) (Dicionário de componentes e hooks do Frontend: Lightbox, Settings e Admin)  
> - [Parte 9 (README_PART9.md)](./README_PART9.md) (Formato binário ENC1/ENC2, OPAQUE, testes de auditoria e segurança cirúrgica)  

---

## 1. Arquitetura da Interface de Usuário (Frontend)

O frontend foi desenvolvido com **React 19**, **TypeScript** estrito, estilização utilitária via **Tailwind CSS v4** e animações fluidas com **Motion**:

### 1.1. Principais Componentes de Tela (`src/components/`)
- **`App.tsx`:** Roteador raiz e orquestrador de ciclo de vida. Gerencia a máquina de estados de autenticação (`AuthStatus`), desvio para compartilhamento público (`PublicShareView`) e interceptor global de segurança.
- **`Gallery.tsx`:** Dashboard central da galeria. Integra a barra superior (`GalleryHeader`), menu lateral expansível (`GallerySidebar`), grade de mídias (`GalleryGrid`), barra de ações em lote (`SelectionBottomBar`) e arrastar-e-soltar (`DragOverlay`).
- **`ProtectedGallery.tsx`:** Espaço criptográfico isolado para fotos e vídeos sensíveis. Bloqueado por senha secundária ou seleção visual da Imagem de Segurança.
- **`Lightbox.tsx` & Módulos Associados:**
  - Visualizador de mídia em tela cheia de alta fidelidade.
  - Otimizado com suporte a gestos multitoque em dispositivos móveis (*pinch-to-zoom*, arraste para fechar e rotação) e controles de desktop via teclado (`DesktopKeyboardZoomListener`).
  - Suporta reprodução nativa de vídeos cifrados via player dedicado (`LightboxVideoPlayer.tsx`).
- **`TrashModal.tsx`:** Lixeira segura com recuperação atômica de mídias e expurgo definitivo com confirmação em duas etapas (`TrashPermanentDeleteModal.tsx`).
- **`SettingsModal.tsx`:** Painel de controle do usuário dividido em abas temáticas:
  - *Segurança:* Tempo de bloqueio automático (*Auto-Lock*), proteção contra capturas e modo privacidade.
  - *Cofre Criptográfico:* Alteração de PIN principal, configuração de cofre falso (*Decoy Vault*) e senha extra.
  - *Armazenamento:* Estatísticas de espaço utilizado e limpeza de cache local.
  - *Aparência:* Seletor dinâmico de temas escuro/claro e esquemas visuais.
  - *Controle de Sessões:* Pareamento seguro de dispositivos e encerramento remoto de sessões.
- **`AdminTab.tsx`:** Painel restrito para administradores com visualização em tempo real de logs de auditoria (`AdminLogsTable`), tabela de usuários gerais e desbloqueio manual de contas punidas.
- **`PublicShareView.tsx`:** Interface simplificada e responsiva para convidados visualizarem arquivos compartilhados sem necessidade de cadastro ou login.

---

## 2. Camada de Hooks Especializados (`src/hooks/`)

O estado da aplicação é desacoplado em hooks especializados para manutenção limpa e previsível:

### 2.1. Galeria e Carregamento de Mídia
- **`useGalleryLogic.ts`:** Orquestrador central que conecta estados de visualização, seleção, exclusão, modais de upload e lightbox.
- **`useGalleryMediaLoader/`:**
  - `fetchImages.ts`: Faz polling e busca metadados no backend D1.
  - `priorityDecryption.ts`: Algoritmo de decifração em cascata que prioriza as miniaturas atualmente visíveis no *viewport* do usuário.
  - `backgroundSync.ts`: Mantém o estado da galeria em sincronia contínua sem travar a thread de renderização da interface.

### 2.2. Exclusão e Lixeira
- **`useGalleryDeletion.ts` & `useTrashLogic.ts`:** Executam exclusões atômicas, movimentação para lixeira e decifração em lotes (*batch progress*) com feedback visual imediato em modal dedicado.

### 2.3. Segurança Ativa no Cliente
- **`useAutoLock.ts`:** Temporizador inteligente de inatividade configurável (1 min, 5 min, 15 min ou imediato). Bloqueia automaticamente o cofre ao detectar perda de foco da janela (`visibilitychange`), troca de abas ou inatividade do mouse/toque.
- **`useDevToolsBlocker.ts`:** Dificulta inspeções não autorizadas da memória e de elementos DOM confidenciais.
- **`useVaultUnlockState.ts`:** Gerencia tentativas de PIN, contador de bloqueios progressivos e integração com WebAuthn.

---

## 3. Desempenho e Armazenamento Local (IndexedDB)

Para eliminar tempos de carregamento repetidos e permitir navegação fluida:
1. **QuickAccess Cache (`src/utils/quickAccess/`):**
   - Utiliza a biblioteca `idb` para persistir localmente no dispositivo do usuário as miniaturas já decifradas.
   - Ao reabrir o cofre, o feed inicial carrega instantaneamente em 0 milissegundos a partir do banco de dados local IndexedDB.
2. **Gestão Rigorosa de Memória (Blobs & Object URLs):**
   - Implementado em `src/utils/fileCrypto/objectUrls/`.
   - Todas as URLs geradas via `URL.createObjectURL()` para visualização de fotos e vídeos são rastreadas e liberadas via `URL.revokeObjectURL()` assim que o componente sai de tela, impedindo vazamentos de memória RAM em sessões longas.

---

> **Continua na Parte 5...**  
> ➡️ **Próxima seção:** [README_PART5.md — Chat Global, Guarly AI, Variáveis de Ambiente, Build e Deploy](./README_PART5.md) (Chat global com áudio WAV, Guarly AI, .env e scripts de deploy)
