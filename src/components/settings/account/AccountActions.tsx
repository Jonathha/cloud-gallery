import React from 'react';
import { LogOut } from 'lucide-react';

export interface AccountActionsProps {
  logOut: () => void;
}

/**
 * Modern logout action button for Account settings tab
 */
export function AccountActions({
  logOut,
}: AccountActionsProps) {
  return (
    <div className="w-full pt-1">
      <button
        type="button"
        onClick={logOut}
        className="w-full py-3.5 px-4 bg-red-500/10 hover:bg-red-500/15 active:scale-[0.98] text-red-400 hover:text-red-300 border border-red-500/20 font-semibold rounded-2xl transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer text-sm shadow-sm"
        aria-label="Encerrar Sessão"
      >
        <LogOut
          size={16}
          strokeWidth={2}
          className="shrink-0"
        />
        <span>Encerrar Sessão</span>
      </button>
    </div>
  );
}

export default AccountActions;
