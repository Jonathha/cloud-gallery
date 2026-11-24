import React from "react";
import { isNativeApp } from "../../utils/isNativeApp";

export default function ProtectedHeader({ count }: { count: number }) {
  const isApp = isNativeApp();
  return (
    <header 
      style={{ paddingTop: isApp ? '2.5rem' : 'calc(0.5rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.5rem' }}
      className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-3 sm:px-6 min-h-14 sm:min-h-20 flex items-center justify-between shrink-0"
    >
      <div>
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Fotos Protegidas
          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-full font-semibold uppercase tracking-wider">Cofre Ativo</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 font-medium">{count} mídias criptografadas</p>
      </div>
    </header>
  );
}
