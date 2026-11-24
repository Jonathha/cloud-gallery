import React from 'react';
import { User, CheckCircle2 } from 'lucide-react';
import { authPrimary } from '../../../firebase';

export interface UserProfileData {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  providerData?: Array<{ providerId: string }>;
}

export interface UserProfileHeaderProps {
  user: UserProfileData | null;
}

/**
 * Modern header card displaying user profile avatar and credentials in Account tab
 */
export function UserProfileHeader({
  user,
}: UserProfileHeaderProps) {
  const avatarUrl = user?.photoURL;
  const displayName = user?.displayName || 'Usuário';
  const email = user?.email || '';
  
  const currentAuth = authPrimary.currentUser;
  const providers = (user?.providerData && user.providerData.length > 0)
    ? user.providerData
    : (currentAuth?.providerData || []);

  const isGoogle = providers.some(p => p.providerId === 'google.com');
  const isPassword = providers.some(p => p.providerId === 'password') || (!isGoogle && Boolean(email));

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-950/60 border border-white/5">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 shrink-0 shadow-inner">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={22} className="text-zinc-400" />
          )}
        </div>
        <div className="overflow-hidden min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h4 className="text-white font-bold text-sm sm:text-base truncate leading-snug">
              {displayName}
            </h4>
            <CheckCircle2 size={13} className="text-blue-400 shrink-0" />
          </div>
          {email && (
            <p className="text-xs sm:text-sm text-zinc-400 font-mono truncate">
              {email}
            </p>
          )}
        </div>
      </div>

      <div className="self-start sm:self-auto shrink-0 flex items-center gap-1.5 flex-wrap">
        {isGoogle && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/5 text-zinc-300 border border-white/10 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Google Login
          </span>
        )}
        {isPassword && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/5 text-zinc-300 border border-white/10 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            E-mail / Senha
          </span>
        )}
      </div>
    </div>
  );
}

export default UserProfileHeader;
