import React from 'react';

export default function PublicQueueView() {
  return (
    <div className="fixed inset-0 bg-[#09090b] flex items-center justify-center p-6 text-[#f5f5f6] select-none font-sans antialiased overflow-hidden">
      <style>{`
        @keyframes rotate {
          to { transform: rotate(360deg); }
        }
        @keyframes enter {
          from {
            opacity: 0;
            transform: translateY(7px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .queue-modal-card {
          animation: enter .3s ease-out both;
        }
        .queue-spinner {
          animation: rotate .8s linear infinite;
        }
      `}</style>

      <main 
        className="queue-modal-card w-full max-w-[440px] p-6 sm:p-[26px] border border-[#28282c] rounded-[17px] bg-[#111113] shadow-[0_30px_100px_rgba(0,0,0,0.8)] text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="title"
        aria-describedby="description"
      >
        <header className="flex items-center gap-2.5 pb-[23px] border-b border-[#242427]">
          <span className="w-[29px] h-[29px] flex items-center justify-center border border-[#37373c] rounded-[8px] text-[#eeeeef]" aria-hidden="true">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 15.5l3.5-4 2.5 2.5 2-2 2 3.5H7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="text-[13px] font-semibold tracking-[-0.2px]">Cloud Gallery</span>
        </header>

        <section className="pt-7">
          <div className="w-[43px] h-[43px] flex items-center justify-center mb-[22px] border border-[#303035] rounded-[12px] bg-[#19191c] text-[#dedee2]" aria-hidden="true">
            <svg className="w-[21px] h-[21px]" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>

          <p className="m-0 mb-2.5 text-[#a5a5ad] text-[10px] font-semibold tracking-[1.15px] uppercase">
            Compartilhamento temporariamente ocupado
          </p>

          <h1 id="title" className="max-w-[350px] m-0 text-[27px] font-medium leading-[1.22] tracking-[-0.95px] text-white">
            Este compartilhamento está com alta demanda
          </h1>

          <p className="my-[13px] mb-6 text-[#a0a0a8] text-[13px] leading-[1.8]">
            Muitas pessoas estão acessando este link ao mesmo tempo. Para manter uma boa experiência para todos, sua entrada será liberada assim que chegar a sua vez.
          </p>

          <section className="p-4 border border-[#2b2b30] rounded-[11px] bg-[#0d0d0f]" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs font-medium text-[#f5f5f6]">
                <span className="queue-spinner w-[15px] h-[15px] flex-none border-[1.7px] border-[#48484f] border-t-[#e6e6e9] rounded-full" aria-hidden="true"></span>
                Aguardando sua vez
              </div>
              <span className="w-1.5 h-1.5 flex-none rounded-full bg-[#a7a7ae]" aria-hidden="true"></span>
            </div>

            <p className="mt-3 ml-[25px] text-[#898991] text-[11px] leading-[1.65]">
              Você está na fila de espera. Não é necessário atualizar esta página.
            </p>
          </section>

          <footer className="flex items-start gap-2.5 mt-5 text-[#74747d] text-[11px] leading-[1.7]">
            <svg className="w-[15px] h-[15px] flex-none mt-0.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
            <span>
              Mantenha esta página aberta. O acesso poderá continuar assim que houver disponibilidade.
            </span>
          </footer>
        </section>
      </main>
    </div>
  );
}
