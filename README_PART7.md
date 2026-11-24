# Guarly — Dicionário de Arquivos do Servidor e Worker

> **Documentação Técnica Oficial do Repositório (Parte 7 de 9)**  
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

## 1. Módulos do Cofre e OPAQUE (`server/workerVault/`)

Gerenciam toda a infraestrutura criptográfica do cofre no Cloudflare Worker:
- **`vaultConfigHandlers.js`:** Retorna `salt`, `verification` e status de bloqueio para que o cliente realize o handshake.
- **`vaultOpaqueRegister.js`:** Executa o registro OPAQUE via `@serenity-kit/opaque`, armazenando o registro criptográfico do cliente sem nunca receber sua senha real em texto claro.
- **`vaultOpaqueLoginInit.js` & `vaultOpaqueLoginFinish.js`:** Conduzem a troca de chaves Diffie-Hellman e prova zero-knowledge para atestar a posse da credencial.
- **`vaultPenaltyHandlers.js`:** Calcula a penalidade de bloqueio com progressão exponencial:
  - 1 a 3 falhas: Sem bloqueio (apenas atraso progressivo).
  - 4 falhas: Bloqueio temporário de 1 minuto.
  - 5 falhas: Bloqueio de 5 minutos.
  - 6 ou mais falhas: Bloqueio de 15 a 30 minutos com registro de evento de segurança.
- **`vaultMediaKeyHandlers.js` & `vaultSaveMediaKey.js`:** Salvam e recuperam o envelope cifrado da chave simétrica de cada foto/vídeo ultrasseguro na tabela `media_keys_store`.
- **`vaultSettingsHandlers.js`:** Atualiza credenciais secundárias, salt do cofre falso e configurações de tema.

---

## 2. Camada de Armazenamento e Mídia (`server/storage*` e `server/workerStorage*`)

Responsável pela ingestão, download e deleção física no Cloudflare R2:
- **`storageUpload.ts` & `workerStorageUpload.js`:** Valida a autenticidade do usuário, insere o arquivo binário `.enc` no bucket R2 e grava os metadados (dimensões, tamanho, tipo MIME) no Cloudflare D1.
- **`storageUploadRaw.ts`:** Recebe streams binários brutos, otimizado para gravações de alta performance e mídias volumosas.
- **`storageGetById.ts` & `workerStorageGet.js`:** Faz streaming direto do R2 com cabeçalhos `Cache-Control: private, no-transform, max-age=31536000` para cache seguro do cliente.
- **`storageDeleteById.ts` & `workerStorageDelete.js`:** Exclusão atômica em três etapas:
  1. Remove do banco D1 (`images`).
  2. Deleta o blob físico no bucket R2 (`images/{id}.enc` e `thumbnails/{id}.enc`).
  3. Expurga chaves auxiliares em `media_keys_store` e links de compartilhamento ativos.

---

## 3. Serviços de Compartilhamento Seguro (`server/shares/` e `server/workerD1Shares/`)

Coordena a geração e o consumo de links públicos:
- **`shareCreate.ts` & `create.js`:** Gera chave determinística única baseada no hash da imagem e do proprietário, inserindo registro na tabela `user_shares_store`. Se configurada proteção por senha, armazena apenas o hash criptográfico com salt.
- **`shareFind.ts` & `lookup.js`:** Localiza rapidamente se uma foto já possui link ativo de compartilhamento para evitar duplicações desnecessárias.
- **`shareViewController.ts` & `viewOneTime.js`:** Controla a visualização pública. Para links do tipo *One-Time* (*burn after reading*), a imagem é decifrada e o registro de compartilhamento é imediatamente destruído no mesmo ciclo de requisição.
- **`ownershipVerifier.ts`:** Garante que apenas o proprietário legítimo autenticado possa revogar ou alterar links de uma mídia.

---

## 4. Controladores Especializados de Banco D1 (`server/workerD1*/`)

- **`workerD1Storage/operations.js`:** Prepared statements SQL para paginação, agregação de contadores de armazenamento (`used_storage`) e ordenação temporal.
- **`workerD1Vault/mediaKeys.js`:** Operações de busca em lote de chaves secundárias para itens da área protegida.
- **`workerD1Logs.js`:** Inserção e consulta de eventos de auditoria com filtros avançados por intervalo de datas e IP.

---

> **Continua na Parte 8...**  
> ➡️ **Próxima seção:** [README_PART8.md — Dicionário de Componentes e Hooks do Frontend](./README_PART8.md) (Dicionário de componentes e hooks do Frontend: Lightbox, Settings e Admin)
