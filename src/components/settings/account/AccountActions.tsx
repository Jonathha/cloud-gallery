import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AccountActionsProps {
  logOut: () => void;
}

export function AccountActions({
  logOut
}: AccountActionsProps) {
  return (
    <>
      <button
        onClick={logOut}
        className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-2xl transition-all flex items-center justify-center gap-2"
      >
        <AlertTriangle size={18} />
        Encerrar Sessão
      </button>
    </>
  );
}
