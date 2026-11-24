# Guarly — Dicionário de Componentes e Hooks do Frontend

> **Documentação Técnica Oficial do Repositório (Parte 8 de 9)**  
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

## 1. Subsistema do Lightbox (`src/components/lightbox/`)

O Lightbox é projetado para visualização multimídia fluida de alta performance, sem que as mídias decifradas fiquem expostas fora do elemento:

### 1.1. Visualização e Gestos em Telas Touch (`mobile/` e `touch/`)
- **`LightboxSlideMobileContent.tsx`:** Controla o ciclo de toques em telas capacitivas.
- **`lightboxSlideMobileTouchStart.ts` & `lightboxSlideMobileTouchMove.ts`:** Captura coordenadas multi-touch, calcula a distância euclidiana entre dois dedos para aplicar zoom elástico (*pinch-to-zoom*) e mede a velocidade do arraste vertical para fechar a visualização (*swipe-to-dismiss*).
- **`lightboxTouchAnimate.ts`:** Executa transições físicas com interpolação suave ao soltar os dedos.

### 1.2. Controles de Desktop (`desktop/`)
- **`LightboxSlideDesktopContent.tsx`:** Suporte a mouse wheel para zoom contínuo e arraste para explorar imagens ampliadas.
- **`DesktopKeyboardZoomListener.tsx`:** Atalhos de teclado (setas para navegar, `+`/`-` para zoom, `0` para resetar e `Esc` para sair).
- **`DesktopZoomFloatingBar.tsx`:** Menu flutuante discreto com controles de lupa e proporção original.

### 1.3. Player de Vídeo Criptografado (`video/`)
- **`LightboxVideoPlayer.tsx`:** Player de vídeo HTML5 alimentado por blobs decifrados em memória.
- **`VideoPlayerTimeline.tsx` & `useVideoSeek.ts`:** Linha do tempo interativa com scrubbing suave, buffer visual e controle de volume/mudo.
- **`VideoLockButton.tsx`:** Trava de tela para evitar toques acidentais durante a reprodução.

---

## 2. Painel de Controle e Configurações (`src/components/settings/`)

Organizado modularmente em subpastas:
- **`SecurityTab.tsx` & `security/`:**
  - `AutoLockCard.tsx`: Seletor de tempo para trancar o cofre por inatividade.
  - `PrivacyModeCard.tsx`: Ativa desfoque automático de miniaturas (*blur*) para impedir olhares curiosos (*shoulder surfing*).
  - `NativeNotificationCard.tsx`: Gerenciamento de permissões de alertas push no Android.
- **`VaultCryptoTab.tsx` & `FakeVaultTab.tsx`:** Troca de PIN, chave mestre e configuração do cofre de emergência/coação.
- **`StorageTab.tsx` & `storage/`:** Gráficos de uso do bucket e botão de purga manual do cache IndexedDB.

---

## 3. Painel Administrativo (`src/components/admin/`)

- **`AdminStatsGrid.tsx`:** Exibe contadores em tempo real: total de usuários, volume de mídias, alertas de ataque e bloqueios vigentes.
- **`AdminLogsTable.tsx` & `logs/`:** Tabela com busca full-text, filtro por data (`LogsCustomDateRange.tsx`), badges de severidade e modal de inspeção de payload bruto (`LogsDetailModal.tsx`).
- **`AdminGeneralTable.tsx` & `general/`:** Ações executivas de suporte: redefinição de tentativas de PIN (`ResetAttemptsView.tsx`) e exclusão definitiva de contas (`DeleteAccountView.tsx`).

---

## 4. Hooks Especializados de Domínio (`src/hooks/`)

- **`useGallerySelection.ts`:** Rastreia seleção múltipla com suporte a seleção sequencial com `Shift + Clique`.
- **`useProtectedGallery.ts` & `useProtectedImages.ts`:** Gerencia o ciclo de vida dos arquivos da aba secreta, buscando chaves individuais sob demanda e decifrando miniaturas via `thumbnailDecryptor.ts`.
- **`useQuickAccessLogic.ts`:** Coordena a sincronização entre a memória volátil do React e as tabelas locais do IndexedDB.

---

> **Continua na Parte 9...**  
> ➡️ **Próxima seção:** [README_PART9.md — Criptografia Profunda, Formatos Binários e Bateria de Testes](./README_PART9.md) (Formato binário ENC1/ENC2, OPAQUE, testes de auditoria e segurança cirúrgica)
