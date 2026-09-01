import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ExternalLink } from 'lucide-react';

interface NewsTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function NewsTab({ showToast }: NewsTabProps) {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/10 rounded-xl text-white">
            <Sparkles size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">O que há de novo</h3>
        </div>

        <div className="space-y-4">
          {[
            {
              title: "Interface Renovada",
              description: "Design mais limpo e moderno, focado na sua privacidade.",
              date: "Março 2026"
            },
            {
              title: "Reparação Automática",
              description: "Novo sistema que detecta e corrige automaticamente imagens que falham ao carregar.",
              date: "Março 2026"
            },
            {
              title: "Criptografia Avançada",
              description: "Suas fotos agora contam com uma camada extra de proteção militar.",
              date: "Fevereiro 2026"
            },
            {
              title: "Lixeira Local",
              description: "Apagou sem querer? Agora você tem 30 dias para recuperar suas fotos.",
              date: "Janeiro 2026"
            }
          ].map((item, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i}
              className="p-4 bg-zinc-900/50 border border-white/10 rounded-2xl group hover:border-white/20 transition-all"
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-white font-medium">{item.title}</h4>
                <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">{item.date}</span>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Sparkles size={80} />
          </div>
          <div className="relative z-10">
            <h4 className="text-white font-bold text-lg mb-2">Sugira uma função</h4>
            <p className="text-sm text-zinc-400 mb-6 max-w-[200px]">
              Sua opinião é fundamental para evoluirmos o aplicativo.
            </p>
            <button
              onClick={() => {
                window.open('https://t.me/seu_canal', '_blank');
                showToast('Abrindo canal de sugestões...');
              }}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 active:scale-95 transition-all text-sm"
            >
              Enviar Sugestão
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
