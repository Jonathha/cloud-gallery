import React from 'react';
import { motion } from 'motion/react';

export const LoginHeader: React.FC = () => {
  return (
    <div className="text-center space-y-2">
      <motion.h1 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white"
      >
        Cloud Gallery
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-zinc-400 text-sm leading-relaxed max-w-[280px] mx-auto font-normal"
      >
        Armazenamento em nuvem com criptografia de ponta a ponta.
      </motion.p>
    </div>
  );
};

export const LoginAmbientBackground: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] bg-white/[0.025] rounded-full blur-3xl" />
    </div>
  );
};
