import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { isNativeApp } from "../utils/isNativeApp";
import { X, ShieldCheck, FileText, UserCheck, Lock, ShieldAlert, Database, BellRing, Mail } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  const isApp = isNativeApp();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "10%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "10%" }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden"
          id="terms-modal-container"
        >
          <div className="flex flex-col h-full bg-zinc-950" id="terms-modal-wrapper">
            {/* Header */}
            <div
              className="flex items-center justify-between pb-4 px-4 sm:p-6 sm:px-8 border-b border-white/5 bg-zinc-900/30 sticky top-0 z-10 w-full backdrop-blur-md"
              id="terms-modal-header"
              style={{ paddingTop: isApp ? "3rem" : "calc(1rem + env(safe-area-inset-top, 0px))" }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/10">
                  <ShieldCheck size={18} className="text-white sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-semibold text-white tracking-tight truncate">
                    Termos de Serviço e Privacidade
                  </h2>
                  <p className="text-[10px] sm:text-xs text-zinc-400">
                    Data de vigência: 19 de setembro de 2026 • Versão 2.4
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0 ml-2"
                aria-label="Fechar"
                id="terms-close-btn"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div
              className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
              id="terms-modal-content"
            >
              <div className="p-4 sm:p-8 md:py-12 md:px-16 max-w-3xl mx-auto w-full space-y-6 sm:space-y-8 text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed">
                
                {/* Introduction Note */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-2" id="terms-intro-box">
                  <span className="text-xs sm:text-sm font-semibold text-white">
                    Bem-vindo ao Cloud Gallery
                  </span>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    Estes termos explicam de maneira clara e transparente como funciona o nosso serviço de armazenamento em nuvem, quais são os seus direitos e deveres ao utilizar nossa plataforma e como cuidamos da sua segurança e privacidade.
                  </p>
                </div>

                {/* Section 1: Visão Geral */}
                <section className="space-y-3" id="section-overview">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <FileText size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    1. Sobre o Serviço
                  </h3>
                  <div className="pl-0 sm:pl-11 space-y-2 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      O <strong className="text-white font-medium">Cloud Gallery</strong> é um aplicativo destinado ao armazenamento, organização e visualização segura de fotos e vídeos pessoais, com recursos de proteção criptográfica no dispositivo.
                    </p>
                    <p>
                      Ao criar uma conta ou navegar em nossa aplicação, você confirma que leu e compreendeu as condições descritas neste documento.
                    </p>
                  </div>
                </section>

                {/* Section 2: Conta e Credenciais */}
                <section className="space-y-3" id="section-account">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <UserCheck size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    2. Sua Conta e Responsabilidades
                  </h3>
                  <div className="pl-0 sm:pl-11 space-y-2 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Para utilizar os recursos de nuvem, é necessário se autenticar utilizando uma conta de e-mail válida ou provedores autorizados. Você é responsável por:
                    </p>
                    <ul className="space-y-1.5 list-none pl-1 text-zinc-400 text-xs sm:text-sm">
                      <li className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-zinc-400">
                        Manter a confidencialidade da sua senha e dos seus métodos de acesso.
                      </li>
                      <li className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-zinc-400">
                        Garantir que os dados fornecidos no cadastro sejam legítimos.
                      </li>
                      <li className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-zinc-400">
                        Notificar nossa equipe caso identifique qualquer acesso não autorizado em sua conta.
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Section 3: Criptografia e Seus Arquivos */}
                <section className="space-y-3" id="section-encryption">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Lock size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    3. Seus Arquivos e Criptografia
                  </h3>
                  <div className="pl-0 sm:pl-11 space-y-2 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Você mantém a titularidade e posse total sobre todos os arquivos e conteúdos que envia para a sua galeria.
                    </p>
                    <p>
                      Quando você ativa o cofre com senha de criptografia, a proteção dos dados ocorre diretamente no seu navegador ou aplicativo antes do envio. Isso significa que nem mesmo a nossa infraestrutura possui a chave para visualizar suas fotos protegidas.
                    </p>
                    <div className="bg-zinc-900/30 border border-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4 mt-2">
                      <span className="text-xs font-medium text-white block mb-1">Guarda da Senha do Cofre</span>
                      <p className="text-xs text-zinc-400">
                        Como a chave de criptografia reside apenas com você, recomendamos que anote ou memorize sua senha do cofre com atenção, pois não temos acesso para visualizá-la ou recuperá-la remotamente.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 4: Uso Aceitável */}
                <section className="space-y-3" id="section-acceptable-use">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <ShieldAlert size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    4. Uso Aceitável da Plataforma
                  </h3>
                  <div className="pl-0 sm:pl-11 space-y-2 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Buscamos manter um ambiente seguro para todos. Ao utilizar a plataforma, você concorda em não:
                    </p>
                    <ul className="space-y-1.5 list-none pl-1 text-zinc-400 text-xs sm:text-sm">
                      <li className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-zinc-400">
                        Armazenar ou distribuir arquivos que violem leis vigentes ou direitos de terceiros.
                      </li>
                      <li className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-zinc-400">
                        Tentar comprometer a estabilidade dos servidores, realizar ataques ou explorar vulnerabilidades.
                      </li>
                      <li className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-zinc-400">
                        Utilizar a plataforma para envio automatizado de spam ou atividades maliciosas.
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Section 5: Privacidade e Dados */}
                <section className="space-y-3" id="section-privacy-policy">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Database size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    5. Privacidade e Tratamento de Dados
                  </h3>
                  <div className="pl-0 sm:pl-11 space-y-2 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Tratamos suas informações pessoais com seriedade e respeito aos princípios da LGPD e normas internacionais de privacidade:
                    </p>
                    <ul className="space-y-1.5 list-none pl-1 text-zinc-400 text-xs sm:text-sm">
                      <li className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-zinc-400">
                        <strong className="text-zinc-200">Dados coletados:</strong> Apenas o endereço de e-mail e dados técnicos estritamente necessários para viabilizar a autenticação e funcionamento do cofre.
                      </li>
                      <li className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-zinc-200">
                        <strong className="text-zinc-200">Não comercialização:</strong> Nunca vendemos, alugamos ou compartilhamos seus dados ou arquivos com terceiros para fins publicitários.
                      </li>
                      <li className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-zinc-200">
                        <strong className="text-zinc-200">Exclusão:</strong> Você pode excluir seus arquivos ou encerrar sua conta quando desejar nas configurações do aplicativo.
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Section 6: Alterações nos Termos */}
                <section className="space-y-3" id="section-updates">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <BellRing size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    6. Atualizações destes Termos
                  </h3>
                  <div className="pl-0 sm:pl-11 space-y-2 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Podemos atualizar este documento periodicamente para refletir melhorias no serviço ou adequações legais. Sempre que houver mudanças relevantes, a data de vigência no topo desta página será atualizada.
                    </p>
                  </div>
                </section>

                {/* Section 7: Contato */}
                <section className="space-y-3" id="section-contact">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Mail size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    7. Dúvidas e Contato
                  </h3>
                  <div className="pl-0 sm:pl-11 space-y-2 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Se você tiver qualquer dúvida ou sugestão sobre estes Termos de Serviço ou sobre nossa Política de Privacidade, entre em contato conosco através do suporte no aplicativo.
                    </p>
                  </div>
                </section>

                {/* Footer */}
                <div className="pb-8 sm:pb-12 border-t border-white/5 pt-6 sm:pt-8 mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between items-center gap-4" id="terms-modal-footer">
                  <p className="text-[10px] sm:text-xs text-zinc-500 font-medium text-center sm:text-left">
                    Cloud Gallery • Armazenamento seguro e privacidade para suas mídias.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto bg-white text-black font-semibold py-2.5 px-6 sm:py-3 sm:px-8 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer text-xs sm:text-sm"
                    id="terms-back-btn"
                  >
                    Entendi e Concordo
                  </button>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

