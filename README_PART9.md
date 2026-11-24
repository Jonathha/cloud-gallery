# Guarly — Criptografia Profunda, Formatos Binários & Bateria de Testes

> **Documentação Técnica Oficial do Repositório (Parte 9 de 9)**  
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

## 1. Formatos dos Contêineres Binários (`ENC1` e `ENC2`)

Para empacotar metadados e múltiplos fluxos de dados cifrados em um único blob atômico, o Guarly adota um formato binário customizado (`src/utils/fileCrypto/encPack.ts` e `encParser.ts`):

### 1.1. Estrutura Binária do Formato V1 (`ENC1`)
- **Bytes 0–3:** Magic Bytes ASCII `ENC1` (`0x45 0x4E 0x43 0x31`).
- **Bytes 4–7:** Inteiro de 32 bits (*Big-Endian*) indicando o tamanho em bytes do cabeçalho de metadados JSON.
- **Bytes 8 a `(8 + metaLength)`:** String UTF-8 contendo metadados (IV, Salt, Dimensões, Nome Original, MIME Type).
- **Bytes restantes:** Ciphertext bruto do arquivo de mídia principal.

### 1.2. Estrutura Binária Avançada V2 (`ENC2`)
- **Bytes 0–3:** Magic Bytes ASCII `ENC2` (`0x45 0x4E 0x43 0x32`).
- **Cabeçalho Multicamadas:** Permite que o cliente faça streaming do arquivo e extraia a miniatura cifrada embutida sem precisar fazer o download integral de um vídeo pesado de centenas de megabytes.

---

## 2. Processamento Concorrente com Web Workers (`workerDecrypt.ts`)

A computação criptográfica intensiva de decifração (PBKDF2 e AES-GCM) pode congelar a interface em dispositivos modestos ao processar lotes de dezenas de fotos:
- O Guarly transfere a decifração pesada para instâncias dedicadas de **Web Workers** em background.
- Os buffers de memória são transferidos via ponte `Transferable Objects` (zero-copy), mantendo a renderização a 60/120 FPS cravados durante rolagens rápidas.

---

## 3. Protocolo OPAQUE de Conhecimento Zero (`@serenity-kit/opaque`)

Diferente de sistemas legados que enviam senhas com hash para o servidor:
- O Guarly implementa o protocolo **aPAKE (asymmetric Password-Authenticated Key Exchange)**.
- O servidor nunca vê a senha nem o hash da senha do usuário em nenhum momento.
- A autenticação é comprovada matematicamente por meio de curvas elípticas e provas de conhecimento zero, eliminando qualquer risco de vazamento de credenciais mesmo em caso de dump integral do banco de dados.

---

## 4. Bateria Automatizada de Testes de Segurança (`tests/`)

O repositório possui suíte de testes de estresse e auditoria cirúrgica executada em CI/CD:

### 4.1. Testes de Integridade de Segurança (`tests/securityAudit.js`)
- **`captchaForgery.js`:** Tenta submeter tokens falsificados para validar a rejeição imediata pelo validador HMAC.
- **`expiredChallenge.js`:** Garante que desafios expirados sejam invalidados mesmo com assinatura intacta.
- **`clearanceAndSecret.js`:** Testa isolamento de módulos e verifica se tokens de um módulo não liberam outro.
- **`durableObjectScope.js`:** Assegura que o isolamento transactional das instâncias de Durable Objects não permita vazamento de contadores.
- **`e2eeIntegrity.js`:** Modifica 1 único bit (*bit-flip*) no ciphertext para garantir que o algoritmo AES-GCM rejeite o payload corrompido com falha de integridade estrita.
- **`oneTimeShare.js`:** Valida que acessos subsequentes a links de queima após leitura (*burn after reading*) retornem `HTTP 404/410` sem chance de recuperação.

### 4.2. Testes de Concorrência e Quotas do Chat (`tests/chatSecurityLimitsAudit.js`)
- Testa concorrência sob estresse de dezenas de mensagens por segundo.
- Valida travas de upload de áudio (`chat_global_locks`) e auto-recuperação de slots órfãos (`chat_global_media_cleanup`).

---

> 🏁 **Conclusão da Documentação Técnica Oficial do Guarly.**  
> 🔗 **Voltar ao Sumário Geral:** [README.md (Parte 1)](./README.md) (Visão geral, arquitetura zero-knowledge, mapa de diretórios raiz e ciclo de vida)
