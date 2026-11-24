# Guarly — Servidor, Cloudflare Worker & Endpoints de API

> **Documentação Técnica Oficial do Repositório (Parte 2 de 9)**  
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

## 1. Arquitetura Dupla de Backend

O Guarly suporta execução híbrida idêntica tanto em desenvolvimento local quanto em produção de borda (*Edge*):

1. **Servidor Local Node.js (`server.ts`):**
   - Utiliza Express com body parser de até 100MB (`express.json({ limit: '100mb' })`).
   - Inicializa o Firebase Admin SDK (`server/firebaseAdmin.ts`) e dispara o serviço assíncrono de sincronização para Backblaze B2 (`server/b2BackupService.ts`).
   - Em desenvolvimento, acopla o servidor Vite em modo middleware (`vite.middlewares`). Em produção (`npm run start`), entrega a pasta estática `/dist`.
2. **Cloudflare Worker Edge (`server/cloudflareWorker.js`):**
   - Execução sem servidor em centenas de data centers globais da Cloudflare.
   - Acesso nativo aos bindings: `DB` (Cloudflare D1), `R2` (Bucket de Mídia), `CHAT_R2` (Bucket de Mensagens de Voz) e `RATE_LIMITER` (Durable Object).
   - Execução cron programada (`triggers.crons = ["*/15 * * * *"]`) para limpeza periódica de áudios órfãos e falhas de upload.

---

## 2. Catálogo Completo de Endpoints da API

Todas as rotas da API são prefixadas com `/api/`. O roteador aplica validação estrita de tipos e sanitização de cabeçalhos.

### 2.1. Autenticação e Verificação (`/api/auth/*`)
- `POST /api/auth/send-code`: Envia código numérico de 6 dígitos para o e-mail do usuário para autenticação passwordless ou recuperação.
- `POST /api/auth/verify-code`: Valida o código gerado, checando tempo de expiração e limite de tentativas contra força bruta.
- `POST /api/auth/migrate-user`: Migra dados e propriedade de arquivos de um login legado para uma nova conta Google vinculada.
- `POST /api/verify-recaptcha`: Valida tokens de desafio gerados pelo Cloudflare Turnstile ou Google reCAPTCHA.

### 2.2. Armazenamento e Mídia (`/api/storage/*`)
- `GET /api/storage/images`: Retorna metadados paginados de todas as fotos e vídeos padrão do usuário autenticado.
- `GET /api/storage/protected-images`: Lista exclusivamente os metadados de itens movidos para a área ultrassegura.
- `POST /api/storage/upload`: Recebe lote de arquivos cifrados (`.enc`), grava no Cloudflare R2 e persiste metadados no Cloudflare D1.
- `POST /api/storage/upload-raw`: Endpoint otimizado para stream de payloads binários brutos.
- `GET /api/storage/image/:id`: Transmite o arquivo cifrado (`.enc`) armazenado no R2 diretamente para decifração local no cliente.
- `DELETE /api/storage/image/:id`: Exclui atomicamente o registro no banco D1, o arquivo físico no R2 e suas chaves auxiliares.
- `GET /api/storage/thumbnail/:id`: Busca a miniatura cifrada em alta velocidade.
- `POST /api/storage/thumbnail/:id`: Faz upload da miniatura cifrada em resolução reduzida para carregamento instantâneo.

### 2.3. Compartilhamento Seguro (`/api/share/*`)
- `POST /api/share/create`: Cria link de compartilhamento determinístico ou protegido por senha.
- `GET /api/share/image/:id`: Localiza status e links ativos de compartilhamento para uma imagem específica do usuário.
- `GET /api/share/view/:id`: Endpoint público para visualização com auto-destruição em links *One-Time*.
- `DELETE /api/share/:id`: Revoga e deleta imediatamente um link de compartilhamento.

### 2.4. Protocolo de Cofre e OPAQUE (`/api/vault/*`)
- `GET /api/vault/config`: Retorna parâmetros públicos de derivação do cofre (salts de PBKDF2, flag de cofre falso).
- `POST /api/vault/setup`: Registra o salt inicial do cofre e o verificador do PIN do usuário.
- `POST /api/vault/penalty`: Incrementa tentativas falhas de desbloqueio e aplica tempo de bloqueio exponencial (*lockout*).
- `POST /api/vault/reset-penalty`: Reseta o contador de penalidades após autenticação bem-sucedida.
- `POST /api/vault/settings`: Altera preferências de segurança, tema e senhas secundárias.
- `GET|POST|DELETE /api/vault/media-key/:id`: Gerencia chaves simétricas individuais de mídias ultrasseguras.
- `POST /api/vault/opaque/register-init` & `register-finish`: Implementa handshake OPAQUE para registro sem revelar senha ao servidor.
- `POST /api/vault/opaque/login-init` & `login-finish`: Handshake de autenticação criptográfica OPAQUE com prova de conhecimento zero.

### 2.5. Chat Global E2EE (`/api/chat/*`)
- `POST /api/chat/auth`: Emite token de sessão para participação no chat global.
- `GET|POST /api/chat/profile`: Consulta ou atualiza apelido público e metadados do remetente.
- `GET|POST /api/chat/messages`: Consulta mensagens recentes particionadas em blocos D1 ou publica nova mensagem criptografada.
- `POST /api/chat/delete-message`: Exclusão de mensagens pelo próprio autor ou moderador administrativo.
- `POST /api/chat/media/upload`: Faz upload de mensagens de voz/áudio cifradas gravadas no navegador para o bucket `CHAT_R2`.
- `GET /api/chat/media/:id`: Retorna o stream do arquivo de áudio criptografado para reprodução no player customizado.
- `GET /api/chat/status`: Retorna o status operacional do chat, contadores de mensagens e versões de esquema.

### 2.6. Auditoria, Administração & Atualizações
- `GET /api/admin/general/users`: Painel administrativo com listagem de usuários, cotas de armazenamento e estados de penalidade.
- `POST /api/admin/general/users/:id/reset-attempts`: Zera penalidades de um usuário bloqueado por excesso de tentativas.
- `DELETE /api/admin/general/users/:id`: Exclui conta e todos os dados associados.
- `POST|GET|DELETE /api/logs/*`: Gravação, listagem e limpeza de logs de auditoria de segurança (`security_logs_store`).
- `GET /api/version`: Retorna versão semântica da aplicação e timestamp de build para auto-atualização do cliente.
- `GET /api/update/download` & `download-exe`: Gera URLs pré-assinadas temporárias (Cloudflare R2) para download dos instaladores APK (Android) e EXE (Windows).

---

> **Continua na Parte 3...**  
> ➡️ **Próxima seção:** [README_PART3.md — Banco de Dados Cloudflare D1, Armazenamento R2 e Arquitetura Criptográfica](./README_PART3.md) (Esquema relacional D1, buckets R2, espelhamento B2 e criptografia base)
