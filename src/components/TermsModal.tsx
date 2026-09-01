import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { isNativeApp } from "../utils/isNativeApp";
import { X, ShieldCheck, Lock, Eye, Scale, Info, FileText } from 'lucide-react';

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
            <div className="flex items-center justify-between  pb-4 px-4 sm:p-6 sm:px-8 border-b border-white/5 bg-zinc-900/30 sticky top-0 z-10 w-full backdrop-blur-md" id="terms-modal-header"
              style={{ paddingTop: isApp ? "3rem" : "calc(1rem + env(safe-area-inset-top, 0px))" }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={18} className="text-white sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-sm sm:text-lg font-semibold text-white tracking-tight truncate">Termos de Uso e Privacidade</h2>
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto" id="terms-modal-content">
              <div className="p-4 sm:p-8 md:py-12 md:px-16 max-w-3xl mx-auto w-full space-y-6 sm:space-y-10 text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed">
                
                {/* Security Highlights Banner */}
                <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-950 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl flex gap-3 sm:gap-4 items-start animate-fadeIn" id="security-highlights-banner">
                  <div className="p-2 sm:p-3 bg-white/5 rounded-lg sm:rounded-xl text-white flex-shrink-0">
                    <ShieldCheck size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm sm:text-base mb-1">Privacidade Sob Seu Controle</h3>
                    <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                      Nossa arquitetura de segurança foi desenhada de forma a garantir que você tenha autonomia total sobre seus dados e mídias, com proteção impenetrável de ponta a ponta.
                    </p>
                  </div>
                </div>

                {/* Section 1 */}
                <section className="space-y-3" id="section-acceptance">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5">
                      <FileText size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    1. Termos de Serviço
                  </h3>
                  <div className="pl-0 sm:pl-10.5 space-y-2 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Ao criar sua conta e acessar a nossa plataforma <strong className="text-white font-medium">Cloud Gallery</strong>, você concorda com os termos descritos neste documento. Esse acordo estabelece as regras de uso e segurança de nosso ecossistema.
                    </p>
                    <p>
                      Caso não concorde com alguma destas diretrizes, por favor, encerre o acesso e descontinue o uso do aplicativo.
                    </p>
                  </div>
                </section>

                {/* Section 2 */}
                <section className="space-y-3" id="section-privacy">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5">
                      <Eye size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    2. Compromisso com sua Privacidade
                  </h3>
                  <div className="pl-0 sm:pl-10.5 space-y-3 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Seguimos princípios rígidos de governança de dados para assegurar que suas informações pessoais estejam sempre protegidas:
                    </p>
                    
                    <div className="grid gap-3 sm:gap-4 mt-2">
                      <div className="bg-zinc-900/30 border border-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4">
                        <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider block mb-0.5">Mínimo de Dados</span>
                        <p className="text-xs sm:text-sm text-zinc-400">Coletamos apenas as credenciais de e-mail necessárias para validar o seu acesso à conta e sincronizar a sua sessão segura.</p>
                      </div>

                      <div className="bg-zinc-900/30 border border-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4">
                        <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider block mb-0.5">Uso Exclusivo</span>
                        <p className="text-xs sm:text-sm text-zinc-400">Suas credenciais servem unicamente para manter seu acesso ativo e autenticado de forma confiável em seu dispositivo.</p>
                      </div>

                      <div className="bg-zinc-900/30 border border-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4">
                        <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider block mb-0.5">Sem Compartilhamento</span>
                        <p className="text-xs sm:text-sm text-zinc-400">Seus dados pessoais, fotos, vídeos ou logs de atividade jamais serão vendidos, divulgados ou compartilhados com terceiros sob qualquer pretexto.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3 */}
                <section className="space-y-3" id="section-security">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5">
                      <Lock size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    3. Tecnologia de Criptografia de Ponta a Ponta
                  </h3>
                  <div className="pl-0 sm:pl-10.5 space-y-3 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Para assegurar a máxima proteção aos seus arquivos privados, empregamos métodos avançados de segurança cibernética:
                    </p>

                    <ul className="space-y-2 list-none text-zinc-400 text-xs sm:text-sm">
                      <li className="relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-white before:font-bold">
                        <strong className="text-white font-medium">Cofre Local Criptografado:</strong> Fotos e vídeos marcados como protegidos passam por criptografia diretamente no seu próprio aparelho antes de serem enviados à nuvem.
                      </li>
                      <li className="relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-white before:font-bold">
                        <strong className="text-white font-medium">Arquitetura Blindada:</strong> Suas senhas e chaves do cofre pertencem exclusivamente a você e não são compartilhadas nem armazenadas em nossos servidores.
                      </li>
                      <li className="relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-zinc-200 before:font-bold text-zinc-300">
                        <strong className="text-white font-medium">Recuperação Impossível:</strong> Como nós não temos acesso à sua senha de acesso ao cofre privado, se você esquecer as suas chaves de segurança pessoais, nós não conseguiremos descriptografar ou reaver suas fotos e vídeos. Guarde suas senhas com o máximo de zelo.
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Section 4 */}
                <section className="space-y-3" id="section-responsibility">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5">
                      <Scale size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    4. Uso Consciente e Responsável
                  </h3>
                  <div className="pl-0 sm:pl-10.5 space-y-2 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Você declara possuir autorização legal para carregar e salvar as fotos e vídeos enviados para o seu espaço pessoal.
                    </p>
                    <p>
                      É estritamente vedado o uso da plataforma para fins abusivos, armazenamento de conteúdos maliciosos ou práticas que desrespeitem as políticas éticas de convivência e as diretrizes da comunidade. Cada usuário responde civil e criminalmente pelas mídias que decide armazenar.
                    </p>
                  </div>
                </section>

                {/* Section 5 */}
                <section className="space-y-3" id="section-general">
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5">
                      <Info size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    5. Atualizações dos Termos
                  </h3>
                  <div className="pl-0 sm:pl-10.5 space-y-2 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Para sempre garantir a melhor proteção aos seus arquivos e adequação técnica às novidades do setor, estes termos podem ser atualizados periodicamente.
                    </p>
                    <p>
                      Ao continuar utilizando o Cloud Gallery, você concorda com as versões vigentes deste documento, as quais buscam sempre melhorar a sua segurança digital.
                    </p>
                  </div>
                </section>
                
                {/* Footer of modal */}
                <div className="pb-8 sm:pb-12 border-t border-white/5 pt-6 sm:pt-10 mt-8 sm:mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6" id="terms-modal-footer">
                  <p className="text-[10px] sm:text-xs text-zinc-500 font-medium text-center sm:text-left">
                    Sua segurança é nosso principal pilar técnico.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto bg-white text-black font-semibold py-2.5 px-6 sm:py-3 sm:px-8 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer text-xs sm:text-sm"
                    id="terms-back-btn"
                  >
                    Entendi, Voltar
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
