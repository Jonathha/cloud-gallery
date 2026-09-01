import React from "react";
import { Shield } from "lucide-react";

export default function ProtectedSetupScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 h-full bg-[#050505]">
      <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-[2rem] p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10">
          <Shield className="text-zinc-300 w-8 h-8" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Cofre de Imagens Protegidas
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Você ainda não definiu uma Senha de Segurança para o cofre.
          </p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Vá em <strong>Configurações</strong> &gt;{" "}
            <strong>Cofre de Segurança</strong> para definir sua senha de até
            15 caracteres e selecionar sua imagem de segurança.
          </p>
        </div>
      </div>
    </div>
  );
}
