import React from 'react';
import { motion } from 'motion/react';
import { Zap, Wrench, ShieldCheck, Share2 } from 'lucide-react';
import { APP_VERSION } from '../../constants';

interface NewsTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function NewsTab({ showToast }: NewsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl text-white">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">O que há de novo</h3>
              <p className="text-xs text-zinc-400">Versão {APP_VERSION}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {[
            {
              icon: Zap,
              title: "Acesso Rápido Instantâneo",
              description: "Entrada acelerada no cofre por PIN ou biometria com carregamento local de mídias.",
              date: "v1.2.0"
            },
            {
              icon: Wrench,
              title: "Manutenção e Lixeira",
              description: "Sistema de reparação automática de mídias e lixeira temporária com retenção de 30 dias.",
              date: "v1.2.0"
            },
            {
              icon: ShieldCheck,
              title: "Proteção Extra e Cofre Falso",
              description: "Mídias com senha dedicada e suporte a PIN alternativo para modo de disfarce.",
              date: "v1.2.0"
            },
            {
              icon: Share2,
              title: "Compartilhamento Criptografado",
              description: "Links temporários protegidos por senha com criptografia AES-256 de ponta a ponta.",
              date: "v1.2.0"
            }
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                key={i}
                className="p-4 bg-zinc-900/50 border border-white/10 rounded-2xl flex items-start gap-3.5 group hover:border-white/20 transition-all"
              >
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-white/5 text-zinc-300 shrink-0 mt-0.5">
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className="text-white font-medium text-sm">{item.title}</h4>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{item.date}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

