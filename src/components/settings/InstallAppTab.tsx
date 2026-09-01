import React from 'react';
import { Download, HelpCircle, Monitor } from 'lucide-react';
import { getApiUrl } from '../../utils/apiUrl';

interface InstallAppTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function InstallAppTab({ showToast }: InstallAppTabProps) {
  const handleInstallApp = () => {
    const targetApkUrl = getApiUrl('/api/update/download');
    const link = document.createElement('a');
    link.href = targetApkUrl;
    link.download = 'app.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Iniciando o download do aplicativo para Android...', 'info');
  };

  const handleInstallExe = () => {
    const targetExeUrl = getApiUrl('/api/update/download-exe');
    const link = document.createElement('a');
    link.href = targetExeUrl;
    link.download = 'app.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Iniciando o download do aplicativo para Windows...', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Android Installation */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/10 rounded-xl text-white">
            <Download size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">Instalação Móvel</h3>
        </div>

        <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-3xl space-y-5">
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Aplicativo Oficial para Android</p>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Baixe e instale a versão oficial para Android para contar com notificações em tempo real, maior estabilidade e performance otimizada para o seu celular.
            </p>
          </div>

          <button
            onClick={handleInstallApp}
            className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm font-mono"
          >
            <Download size={20} strokeWidth={2.5} />
            Baixar Instalador (APK)
          </button>
        </div>
      </div>

      {/* Windows Installation */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/10 rounded-xl text-white">
            <Monitor size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">Instalação Desktop</h3>
        </div>

        <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-3xl space-y-5">
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Aplicativo Oficial para Windows (Tauri)</p>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Acesse seu cofre seguro diretamente pelo Windows através de uma janela nativa isolada com segurança avançada e excelente integração com o sistema operacional.
            </p>
          </div>

          <button
            onClick={handleInstallExe}
            className="w-full py-4 bg-white/10 border border-white/15 text-white font-bold rounded-2xl hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm font-mono"
          >
            <Download size={20} strokeWidth={2.5} />
            Baixar para Windows (.EXE)
          </button>
        </div>
      </div>

      {/* How to install guide */}
      <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-3xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/5 rounded-lg text-zinc-300">
            <HelpCircle size={16} />
          </div>
          <p className="text-sm font-semibold text-white">Como instalar?</p>
        </div>

        <div className="space-y-3.5 text-left text-xs text-zinc-400 leading-relaxed">
          <div className="flex gap-2.5 items-start">
            <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white font-bold shrink-0 mt-0.5">
              1
            </div>
            <p>Clique em <strong>"Baixar Instalador (APK)"</strong> para Android ou <strong>"Baixar para Windows (.EXE)"</strong> para PC.</p>
          </div>
          <div className="flex gap-2.5 items-start">
            <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white font-bold shrink-0 mt-0.5">
              2
            </div>
            <p>No celular, autorize a instalação de fontes desconhecidas se solicitado. No Windows, execute o arquivo .exe e confirme as permissões de segurança de tela.</p>
          </div>
          <div className="flex gap-2.5 items-start">
            <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white font-bold shrink-0 mt-0.5">
              3
            </div>
            <p>Faça login na sua conta existente para manter todas as suas fotos, vídeos e mensagens sincronizados em tempo real.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
