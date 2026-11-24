# Guarly — Banco D1, Armazenamento R2 & Criptografia E2EE

> **Documentação Técnica Oficial do Repositório (Parte 3 de 9)**  
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

## 1. Esquema do Banco de Dados Cloudflare D1

O Cloudflare D1 opera como uma base SQL relacional baseada em SQLite distribuído globalmente (`server/d1_schema.sql` e `server/chat/d1Schema.js`).

### 1.1. Principais Tabelas Relacionais
- **`users`:** Metadados básicos de conta (UID do Firebase Auth, e-mail, nome de exibição e timestamps).
- **`images`:** Índice relacional de mídia (ID, `user_id`, dimensões `width`/`height`, `duration` para vídeos, flag `is_video`, flag `is_protected`, chaves `r2_key`, `thumbnail_key` e metadados JSON auxiliares).
- **`user_metadata_store`:** Sistema de blocos particionados (*chunks* de até 1.8 MB por usuário). Armazena metadados de mídia de forma compactada e selada (`is_closed`), eliminando sobrecarga de linhas individuais em galerias gigantes.
- **`user_vault_store`:** Estado de segurança criptográfico do cofre de cada usuário:
  - `salt` e `verification`: Parâmetros de validação do PIN primário.
  - `failed_attempts` e `locked_until`: Contador de tentativas incorretas e timestamp de penalidade.
  - `fake_vault_salt` e `fake_vault_verification`: Parâmetros do cofre falso (*Decoy Vault*).
  - `security_image_id`, `extra_password_salt`, `extra_password_verification`: Proteções adicionais para itens ultrasseguros.
- **`media_keys_store`:** Envelopes criptográficos individuais de arquivos ultrasseguros (`key_ciphertext`, `iv`, `salt`), decifráveis apenas com a senha secundária do usuário.
- **`user_shares_store` & `shares`:** Links de compartilhamento ativos, hashes de senhas de acesso, contagem de acessos (`view_count`), flag de link de uso único (`is_one_time`) e chave de expiração.
- **`security_logs_store`:** Trilha de auditoria imutável (login, falhas de PIN, bloqueios, eventos de probe de IP e agente de usuário).
- **`auth_verifications` & `user_devices`:** Validação temporária de códigos de 6 dígitos e tokens FCM de notificações Android.
- **Tabelas do Chat Global (`chat_global_*`):** Chunks de mensagens JSON, controle de concorrência com travas (`chat_global_locks`), registro de uploads de áudio em andamento (`chat_global_audio_uploads`) e fila de expurgo de arquivos órfãos (`chat_global_media_cleanup`).

---

## 2. Camada de Armazenamento de Arquivos (R2 & B2)

### 2.1. Cloudflare R2 (Object Storage)
O Guarly utiliza dois buckets R2 isolados:
1. **`cloudgallery`:**
   - `images/{id}.enc`: Arquivos originais (fotos e vídeos) compactados e cifrados via AES-GCM.
   - `thumbnails/{id}.enc`: Miniaturas ultraleves cifradas, permitindo renderização imediata do feed da galeria.
2. **`cloud-gallery-chat`:**
   - `audio/{id}.enc`: Mensagens de voz em formato WAV gravadas no cliente, comprimidas e criptografadas.

### 2.2. Espelhamento e Backup para Backblaze B2 (`server/b2BackupService.ts`)
Para garantir redundância contra falhas e retenção externa de desastre:
- Um serviço contínuo em segundo plano sincroniza arquivos `.enc` do bucket R2 diretamente para o Backblaze B2.
- O arquivo `b2_synced.json` mantém controle dos blobs já replicados, evitando re-upload redundante e economizando tráfego de rede.
- Os dados enviados para o B2 permanecem 100% cifrados; nem mesmo os operadores da nuvem possuem a chave de leitura.

---

## 3. Arquitetura Criptográfica e Conhecimento Zero (E2EE)

Toda a criptografia é executada nativamente pelo navegador via **Web Crypto API** (`src/utils/crypto.ts` e `src/utils/fileCrypto/`):

### 3.1. Primitivas e Algoritmos
- **Cifra Simétrica:** AES-GCM (Galois/Counter Mode) de 256 bits com IV aleatório de 12 bytes gerado via `window.crypto.getRandomValues`.
- **Derivação de Chaves:** PBKDF2 com 100.000 iterações, hash SHA-256 e salt criptográfico único de 16 bytes.
- **Chaves Criptográficas de Arquivo (`v2_`):** Chaves de alta performance derivadas dinamicamente para cada item, garantindo que o comprometimento de um arquivo jamais exponha os demais.

### 3.2. Mecanismo de Cofre Falso (Anti-Coerção / Duress PIN)
- O usuário pode configurar dois PINs distintos no momento da criação do cofre: o **PIN Real** e o **PIN de Coação (Fake PIN)**.
- Se for forçado por terceiros a abrir o cofre, ao digitar o PIN Falso o sistema valida com sucesso a credencial falsa, mas deriva uma chave mestra alternativa.
- A galeria é exibida vazia ou apenas com as fotos vinculadas ao cofre falso, sem alertar visualmente o invasor de que se trata de uma partição fake.

### 3.3. Senha Extra & Imagem de Segurança (Área Ultrassegura)
- O usuário pode eleger uma foto ou definir uma senha extra para bloquear o acesso à aba "Protegidos" (`ProtectedGallery.tsx`).
- Itens movidos para a área protegida têm sua chave de arquivo cifrada novamente por uma chave auxiliar (`securityAuxKey.ts`), impedindo visualização mesmo com o cofre principal destravado.

### 3.4. Compartilhamento Seguro com Fragmento de Hash (#key)
- Ao compartilhar um arquivo, a chave simétrica de decifração é inserida no fragmento de âncora da URL (`https://.../?share=xyz#key=...`).
- Conforme o padrão HTTP RFC 3986, navegadores **jamais transmitem o fragmento `#` para os servidores**. Logo, nem o Cloudflare Worker nem os servidores Node.js conhecem a chave de abertura do arquivo compartilhado.

---

> **Continua na Parte 4...**  
> ➡️ **Próxima seção:** [README_PART4.md — Frontend React 19, Componentes de UI, Hooks e Gerenciamento de Estado](./README_PART4.md) (Arquitetura React 19, componentes visuais, hooks reativos e cache IndexedDB)
