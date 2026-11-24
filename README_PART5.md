# Guarly — Chat Global E2EE, IA, Configuração & Deploy

> **Documentação Técnica Oficial do Repositório (Parte 5 de 9)**  
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

## 1. Subsistema do Chat Global E2EE

O Guarly possui uma central de comunicação global integrada diretamente na interface principal (`ChatTab.tsx`), operando com criptografia de ponta a ponta:

1. **Mensagens de Texto Cifradas:**
   - O texto digitado é encriptado antes do envio (`messageSendText.ts`), gerando `textCiphertext` e `textIv`.
   - As mensagens são agrupadas em blocos JSON persistidos no Cloudflare D1 (`chat_global_json_chunks`), garantindo escalabilidade sem exceder limites de linhas.
2. **Mensagens de Voz & Gravador de Áudio Nativo:**
   - Gravador em tempo real com encoder WAV integrado (`audioWavEncoder.ts` e `useAudioRecorder.ts`).
   - O áudio bruto gravado no microfone é cifrado localmente e enviado para o bucket `CHAT_R2`.
   - Player de áudio customizado (`ChatAudioPlayer.tsx`) com visualizador de forma de onda, controle de velocidade e scrubber interativo.
3. **Resiliência e Auto-Limpeza:**
   - Controle de concorrência com travas temporárias (`chat_global_locks`).
   - Rotina periódica (*Cron Trigger*) que reconcilia uploads interrompidos e limpa áudios órfãos (`processPendingMediaCleanups`).

---

## 2. Guarly AI & Mecanismo de Fallback

Localizado em `server/guarly/` e `server/guarlyAiController.ts`:

1. **Assistente Inteligente Especialista:**
   - Alimentado pelo SDK do Google Gemini com prompt de sistema rigoroso (`guarlyPrompt.ts`).
   - Base de conhecimento contextual (`guarlyKnowledgeBase.ts`) cobrindo todas as funcionalidades de criptografia, compartilhamento e recuperação da plataforma.
2. **Motor de Fallback Local (`guarlyFallbackEngine.ts`):**
   - Caso a API do modelo esteja indisponível ou sem chave configurada, um motor semântico local responde instantaneamente a dúvidas técnicas frequentes.
3. **Proteção Anti-Abuso e Banimento (`guarlyBanHelper.ts`):**
   - Sistema de pontuação que bloqueia temporária ou permanentemente usuários que tentem engenharia reversa de prompts, injeção de comandos ou comportamento ofensivo.

---

## 3. Variáveis de Ambiente (`.env.example`)

Para executar a aplicação com todos os recursos habilitados, configure o arquivo `.env`:

```env
# Servidor Node.js
PORT=3000
NODE_ENV=development

# Firebase Admin SDK (Autenticação Primária)
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@seu-projeto-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cloudflare R2 Object Storage (Galeria e Miniaturas)
R2_ACCOUNT_ID=seu_account_id_cloudflare
R2_ACCESS_KEY_ID=sua_access_key_r2
R2_SECRET_ACCESS_KEY=sua_secret_key_r2
R2_BUCKET_NAME=cloudgallery
CHAT_R2_BUCKET_NAME=cloud-gallery-chat

# Backblaze B2 (Backup Criptografado Externo)
B2_KEY_ID=sua_key_id_b2
B2_APPLICATION_KEY=sua_application_key_b2
B2_BUCKET_ID=seu_bucket_id_b2
B2_BUCKET_NAME=seu_bucket_nome_b2

# Proteção e IA
GEMINI_API_KEY=sua_chave_gemini_api
TURNSTILE_SECRET_KEY=sua_chave_secreta_turnstile
RECAPTCHA_SECRET_KEY=sua_chave_secreta_recaptcha
```

---

## 4. Guia de Compilação, Execução e Deploy

### 4.1. Desenvolvimento Local
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor Node.js com Vite integrado
npm run dev
# Acesse em http://localhost:3000
```

### 4.2. Build de Produção
```bash
# Compila o frontend React (Vite) e empacota o backend Node.js (esbuild)
npm run build

# Executar o servidor de produção
npm run start
```

### 4.3. Deploy no Ecossistema Cloudflare
```bash
# Deploy do Backend Serverless no Cloudflare Workers
npm run deploy:worker

# Deploy do Frontend no Cloudflare Pages
npm run deploy
```

---

## 5. Aplicativos Nativos (Android APK & Windows EXE)

O Guarly disponibiliza distribuição multiplataforma:
- **PWA (Progressive Web App):** Instalável no celular e desktop diretamente pelo navegador (`vite-plugin-pwa` e `public/icon.svg`).
- **Android APK:** Aplicação nativa com ponte de autenticação biométrica (`useAndroidAuthBridge.ts`) e notificações push. Os instaladores são disponibilizados via URLs pré-assinadas temporárias em `/api/update/download`.
- **Windows EXE:** Instalador para computadores desktop distribuído via `/api/update/download-exe`.

---

> **Continua na Parte 6...**  
> ➡️ **Próxima seção:** [README_PART6.md — Motor de Abuse Protection, Turnstile, Durable Objects e Probes](./README_PART6.md) (Motor de Abuse Protection, Turnstile, Durable Objects e detecção de sondagens)
