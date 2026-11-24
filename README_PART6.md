# Guarly — Motor de Abuse Protection, Turnstile, Durable Objects & Probes

> **Documentação Técnica Oficial do Repositório (Parte 6 de 9)**  
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

## 1. Arquitetura Modular de Proteção Contra Abusos (`server/abuseProtection/`)

O sistema adota **isolamento estrito por módulo**. Um usuário que exceder o limite de requisições no chat ou no upload não terá sua autenticação bloqueada indevidamente:

### 1.1. Módulos Monitorados (`types.ts`)
- `auth`: Tentativas de login, envio de código de 6 dígitos e verificação.
- `storage`: Listagem de arquivos e miniaturas.
- `upload`: Envio de mídias criptografadas.
- `share_view`: Acessos a links públicos compartilhados.
- `share_create`: Geração de novos links de compartilhamento.
- `chat`: Publicação de mensagens e uploads de áudio.
- `logs`: Consulta de trilhas de auditoria.
- `general`: Demais endpoints e rotas genéricas.

### 1.2. Estrutura dos Rastreadores em Memória (`trackers.ts`)
- Cada módulo possui um `Map<string, IpTrackingData>` exclusivo.
- Estrutura de rastreamento:
  - `windowStart`: Início da janela deslizante (duração de 32 minutos).
  - `attempts`: Contador de requisições dentro da janela.
  - `blockedUntil`: Timestamp de liberação de bloqueio forçado (HTTP 429).
  - `captchaRequired`: Flag indicando necessidade de validação via desafio humano.
  - `captchaSolvedAtAttempts`: Registro da última contagem de requisições em que o CAPTCHA foi resolvido com sucesso.
- **Garbage Collection Automático:** A cada 10 minutos, um timer de limpeza expurga chaves inativas cuja janela de 32 minutos já expirou.

---

## 2. Detecção Ativa de Sondas e Scanners (`probeRecorder.ts`)

O subsistema intercepta tentativas hostis antes que atinjam as camadas de dados:
1. **Interceptação de Respostas 401, 403 e 404:** O middleware encapsula `res.send()` e cataloga automaticamente requisições anômalas para rotas inexistentes (`/api/*`).
2. **Registro de Probes (`recordProbeAttempt`):** Salva o IP, User-Agent, cabeçalhos de origem e rota violada na tabela `security_logs_store`.
3. **Punição Progressiva:** Se o mesmo IP disparar mais de 3 sondagens em um curto intervalo, seu endereço é marcado como hostil, ativando bloqueio preventivo de 1 hora.

---

## 3. Rate Limiter Distribuído via Durable Objects (`limiterDo.js`)

No ambiente Cloudflare Worker, onde nós serverless não compartilham memória RAM, o controle de taxa é centralizado em uma instância única de **Durable Object**:
- **Consistência Atômica:** Utiliza uma tabela SQLite local gerenciada pelo runtime da Cloudflare (`RateLimiter`).
- **Verificação com Delay Progressivo:** Conforme o número de requisições se aproxima do teto, o Worker insere artificialmente atrasos de 200ms a 1500ms (`delayMs`), neutralizando ataques de concorrência massiva (*burst attacks*) sem degradar a experiência de usuários legítimos.
- **Validação de Turnstile e Clearance Tokens:** Ao resolver o CAPTCHA, o cliente recebe um token assinado com HMAC-SHA256 válido por 30 minutos, liberando as requisições subsequentes do módulo.

---

## 4. Camada ZeroThreat (`zeroThreatMiddleware.ts`)

A camada ZeroThreat atua no topo da pilha de requisições:
- Intercepta imediatamente as rotas `/zero-threat`, `/zero-threat.html`, `/zerothreat` e `/zerothreat.html`.
- Retorna o corpo HTML canônico com a chave de verificação TXT e cabeçalhos `Access-Control-Allow-Origin: *` sem tocar o restante dos middlewares, assegurando aprovação imediata em ferramentas de auditoria e scans automatizados de conformidade.

---

> **Continua na Parte 7...**  
> ➡️ **Próxima seção:** [README_PART7.md — Dicionário de Arquivos do Servidor e Worker](./README_PART7.md) (Dicionário de arquivos do backend Node/Worker: Vault, Storage, Shares e D1)
