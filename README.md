# Guarly — Cofre em Nuvem com Criptografia de Conhecimento Zero (E2EE)

> **Documentação Técnica Oficial do Repositório (Parte 1 de 9)**  
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

> **Fonte da verdade dos dados (leia antes de mexer em compartilhamentos):**
> - **Produção = Cloudflare Worker + D1 (`guarly`) + R2.** Todo o fluxo de compartilhamento (`user_shares_store`, `share_access_logs`) vive no D1: `server/cloudflareWorker.js` → `workerShare/` → `workerD1Shares/`.
> - **Firebase é só autenticação/sessão** (login, `remote_sessions`, perfil, push, suporte). Metadados de mídia e shares **não** ficam no Firestore.
> - **`server.ts` + `server/share*.ts` + `server/firestoreREST.ts` (Express/Firestore)** são o caminho legado/de desenvolvimento (`npm run dev`/`start`). Não representam a produção; correções de compartilhamento precisam ser feitas também no Worker/D1.

---

## 1. Visão Geral do Sistema

O **Guarly** é uma plataforma de armazenamento em nuvem, galeria multimídia protegida e mensageria em tempo real, construída sob o paradigma de **Zero-Knowledge** (Conhecimento Zero) e criptografia de ponta a ponta (**E2EE** - End-to-End Encryption).

### Pilares Fundamentais
1. **Privacidade Absoluta (E2EE):** Fotos, vídeos e áudios são cifrados localmente no navegador via Web Crypto API (AES-GCM de 256 bits e PBKDF2) antes do envio. Os servidores Cloudflare R2, Cloudflare D1 e Backblaze B2 recebem apenas contêineres binários cifrados (`.enc`), sem acesso às chaves mestras.
2. **Autenticação OPAQUE & Anti-Coerção:** Implementação de protocolo OPAQUE com suporte a cofre falso (*Decoy Vault*) para situações de emergência sob coação.
3. **Arquitetura Híbrida de Alta Disponibilidade:**
   - **Frontend:** SPA construído em React 19, TypeScript, Tailwind CSS v4, Motion e IndexedDB (`idb`).
   - **Backend Local/Node:** Servidor Express (`server.ts`) com Vite middleware integrado.
   - **Backend Edge/Serverless:** Cloudflare Worker (`cloudflareWorker.js`) integrado com Cloudflare D1 (SQL relacional serverless), Cloudflare R2 (Object Storage) e Durable Objects para Rate Limiting granular.
   - **Proteção e Defesa:** Camada ZeroThreat, detecção anti-sondagem (*probe recorder*) e CAPTCHA inteligente (Turnstile e reCAPTCHA).

---

## 2. Estrutura Completa de Diretórios

```text
/
├── .env.example                  # Modelo de variáveis de ambiente do sistema
├── wrangler.toml                 # Configuração Cloudflare Pages e bindings D1/R2
├── wrangler.worker.toml          # Configuração Cloudflare Worker backend e Durable Objects
├── server.ts                     # Ponto de entrada do servidor Node.js/Express
├── index.html                    # Ponto de entrada HTML da aplicação SPA
├── package.json                  # Dependências de runtime e scripts de compilação
│
├── server/                       # Camada de Backend (Node.js & Cloudflare Worker)
│   ├── cloudflareWorker.js       # Router principal do Cloudflare Worker Edge
│   ├── d1_schema.sql             # Esquema D1 completo (tabelas, índices e triggers)
│   ├── authMiddleware.ts         # Middleware de validação de tokens JWT/Firebase
│   ├── zeroThreatMiddleware.ts   # Interceptor de verificação ZeroThreat
│   ├── abuseProtection/          # Motor modular de proteção contra ataques e rate limit
│   ├── admin/                    # Handlers administrativos do banco D1
│   ├── chat/                     # Gerenciamento de tabelas, locks e chunks do Chat D1
│   ├── guarly/                   # IA Guarly, base de conhecimento e fallback engine
│   ├── logs/                     # Registro de auditoria e logs de segurança
│   ├── r2Client/                 # Cliente S3/R2 para upload, download e presigned URLs
│   ├── shares/                   # Serviços de compartilhamento e resolução determinística
│   ├── worker/                   # Módulos especializados para o ambiente Cloudflare Worker
│   └── workerD1*/                # Controladores de dados para Vault, Storage, Shares e Logs
│
├── src/                          # Camada de Frontend (React 19 + TypeScript)
│   ├── main.tsx                  # Inicialização da árvore DOM React
│   ├── App.tsx                   # Roteador central, lazy loading e interceptor de segurança
│   ├── constants.ts              # Constantes de configuração e limites do cliente
│   ├── firebase.ts               # Inicialização dos SDKs Firebase Auth e Firestore
│   ├── components/               # Componentes de interface de usuário (UI)
│   │   ├── Gallery.tsx           # Visualizador principal da galeria segura
│   │   ├── ProtectedGallery.tsx  # Área restrita protegida por senha secundária
│   │   ├── TrashModal.tsx        # Lixeira com restauração e exclusão atômica
│   │   ├── ChatTab.tsx           # Interface do chat global com áudio e E2EE
│   │   ├── AdminTab.tsx          # Painel de auditoria, estatísticas e gerenciamento
│   │   ├── SettingsModal.tsx     # Configurações de conta, cofre falso e criptografia
│   │   ├── Lightbox.tsx          # Visualizador imersivo para imagens e vídeos
│   │   ├── VaultUnlock.tsx       # Tela de desbloqueio de PIN e biometria WebAuthn
│   │   └── PublicShareView.tsx   # Visualização pública de arquivos compartilhados
│   │
│   ├── contexts/                 # Contextos globais (AuthContext, PrivateModeContext)
│   ├── hooks/                    # Hooks reutilizáveis (useGalleryLogic, useShareLogic, etc.; os hooks do chat ficam em components/chat/)
│   ├── services/                 # Serviços de auditoria, progresso em lote e APIs
│   └── utils/                    # Funções utilitárias (criptografia, compressão, IndexedDB)
│       ├── fileCrypto/           # Motor de criptografia em lote, derivação e streams
│       ├── media/                # Geração de miniaturas e compressão de vídeo/foto
│       └── quickAccess/          # Cache offline instantâneo via IndexedDB
│
└── tests/                        # Bateria de testes de segurança e auditoria E2EE
```

### 2.1. Mapa Rápido: Onde Fica Cada Coisa

Use esta tabela para ir direto ao arquivo certo (vale para pessoas e para IAs/agentes). Caminhos relativos à raiz do repositório.

**Frontend (`src/`)**

| Quero mexer em... | Onde está |
| :--- | :--- |
| Visualizador de foto/vídeo (contêiner, animação de abrir/fechar) | `src/components/Lightbox.tsx` |
| Slides, controles, gestos e player do visualizador | `src/components/lightbox/` (`desktop/`, `mobile/`, `touch/`, `video/`) |
| Lógica de abrir/fechar e clique no item do lightbox | `src/hooks/gallery/lightbox/` (`lightboxOpenClose.ts`, `lightboxItemClick.ts`) e `src/hooks/gallery/useGalleryLightbox*.ts` |
| Modal de excluir mídia | `src/components/DeleteMediaModal.tsx` (usado em `components/gallery/GalleryConfirmModals.tsx` e `components/protected/ProtectedModals.tsx`) |
| Lógica de excluir (estado `imageToDelete`) | `src/hooks/gallery/useGalleryDeletion.ts` e `src/hooks/gallery/useGalleryGlobalState.ts` |
| Grade da galeria e cada item | `src/components/gallery/` (`GalleryGrid.tsx`, `GalleryItem.tsx`, `item/`). `src/components/GalleryItem.tsx` é só um re-export |
| Orquestração de toda a galeria | `src/hooks/useGalleryLogic.ts` → `src/hooks/gallery/useGalleryIntegration.ts` |
| Carregar, baixar e decifrar mídias | `src/hooks/gallery/useGalleryMediaLoader/`, `decrypt/`, `loaders/`, `fetcher/` |
| Seleção em lote | `src/hooks/gallery/useGallerySelection.ts` e `src/hooks/gallery/selection/` |
| Lixeira | `src/components/TrashModal.tsx`, `components/trash/`, `src/hooks/useTrashLogic.ts`, `hooks/trash/`, `hooks/gallery/trash/` |
| Galeria protegida (senha extra) | `src/components/ProtectedGallery.tsx`, `components/protected/`, `src/hooks/protected/` |
| Compartilhamento (dono do arquivo) | `src/components/ShareModal.tsx` e `Share*.tsx`, `src/hooks/useShareLogic.ts`, `src/hooks/share/` |
| Compartilhamento (visualização pública) | `src/components/PublicShareView.tsx`, `components/publicShare/`, `src/hooks/usePublicShareLogic.ts` |
| Login, criação e desbloqueio do cofre | `Login.tsx`, `VaultSetup.tsx`, `VaultUnlock.tsx` (e pastas `login/`, `vaultSetup/`, `vaultUnlock/` ao lado), `src/hooks/useLoginLogic.ts`, `src/hooks/vaultUnlock/` |
| Sessão, PIN, auto-lock e chaves do cofre | `src/contexts/AuthContext.tsx` e `src/contexts/vault/` |
| Configurações | `src/components/SettingsModal.tsx`, `components/settings/`, `src/hooks/useSettingsLogic.ts`, `hooks/settings/` |
| Chat (UI e hooks) | `src/components/ChatTab.tsx` e `src/components/chat/` (hooks como `useChatMessages.ts` ficam aqui) |
| Painel admin | `src/components/AdminTab.tsx` e `components/admin/` |
| Criptografia, miniaturas, cache offline | `src/utils/fileCrypto/`, `utils/media/`, `utils/quickAccess/`, `utils/db.ts` (IndexedDB) |
| Estilos globais e tema claro | `src/index.css`, `src/styles/base.css`, `src/styles/themeLight/part-01.css … part-11.css` (a ordem das regras importa) |

**Backend (`server/`) — a produção roda no Cloudflare Worker**

| Quero mexer em... | Onde está |
| :--- | :--- |
| Roteador da produção | `server/cloudflareWorker.js` (módulos `worker*.js` e pastas `worker*/` ao lado) |
| Upload, listagem, leitura e exclusão de mídias | `server/workerStorage*.js` e `server/workerD1Storage*` |
| Login, verificação e cofre | `server/workerAuth*.js`, `server/workerVault*`, `server/workerD1Auth.js`, `server/workerD1Vault*` |
| Compartilhamento | `server/workerShare*` e `server/workerD1Shares*` |
| Chat | `server/workerChat*.js` e `server/workerChat/` |
| IA Guarly | `server/workerGuarlyAi.js` e `server/workerGuarly/` |
| Logs e auditoria | `server/workerLogs*` e `server/workerD1Logs.js` |
| Proteção contra abuso e rate limit | `server/workerAbuseProtection.js` e `server/abuseProtection/` |
| Esquema do banco D1 | `server/d1_schema.sql` |
| Caminho legado/dev (Express + Firestore) | `server.ts` e `server/*Controller.ts`, `server/storage*.ts`, `server/share*.ts` |

**Convenções de nome (ajudam a achar arquivos)**
- Componentes React: `PascalCase.tsx`. Hooks: `useAlgo.ts(x)`. Helpers e utilitários: `camelCase.ts`.
- Cada feature grande tem uma pasta com o mesmo nome do componente (ex.: `Lightbox.tsx` + `lightbox/`, `SettingsModal.tsx` + `settings/`).
- `types.ts` dentro de uma pasta guarda só os tipos daquela pasta.
- Arquivo de 1 linha com `export { default } from ...` é um re-export para o arquivo real em subpasta.

**Para IAs e agentes (leia antes de editar)**
- A produção usa Cloudflare Worker + D1 + R2 (`server/worker*`). `server.ts` e `server/*Controller.ts` são o caminho legado/dev: uma correção de backend normalmente precisa ser feita no Worker; no legado só se o dev também precisar dela.
- Firebase é só autenticação/sessão. Metadados de mídia e shares ficam no D1.
- Para validar mudanças de código: `npm run lint` (é um `tsc --noEmit`). Não há script de testes em `package.json`; os testes de segurança ficam em `tests/` (ver README_PART9.md).
- Edite só o que foi pedido: a UI tem muita animação (`motion/react`) e `layoutId` compartilhado entre grade e lightbox, então mudanças de estilo ou de montagem de componentes podem alterar transições em outros lugares.

---

## 3. Fluxo de Vida e Execução da Aplicação

1. **Bootstrap do Navegador (`index.html` -> `main.tsx`):**
   - O cliente carrega o núcleo mínimo e monta o `App.tsx`.
   - Telas autenticadas e módulos pesados (`Gallery`, `ChatTab`, `ProtectedGallery`, `SettingsModal`) são carregados sob demanda via `React.lazy()`.

2. **Fluxo de Autenticação e Estados (`AuthStatus`):**
   - `Loading`: Validação assíncrona da sessão ativa.
   - `Unauthenticated`: Exibe o formulário de login (`Login.tsx`).
   - `NeedsSetup`: Redireciona para o assistente de configuração de cofre (`VaultSetup.tsx`).
   - `Locked`: Cofre trancado. Exige PIN do usuário ou biometria WebAuthn (`VaultUnlock.tsx`).
   - `Unlocked`: Cofre decifrado na memória volátil (`Gallery.tsx`).

3. **Modo Compartilhamento Público (`isShare`):**
   - Acesso a `/?share={token}` desvia para `PublicShareView.tsx`, decifrando mídias públicas ou protegidas por senha única sem exigir login.

---

> **Continua na Parte 2...**  
> ➡️ **Próxima seção:** [README_PART2.md — Servidor Node.js Express, Cloudflare Worker Edge e Endpoints](./README_PART2.md) (Servidor Express, Cloudflare Worker, catálogo de rotas da API e ZeroThreat)
