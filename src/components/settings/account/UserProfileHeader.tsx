import React from "react";
import { User } from "lucide-react";

interface UserProfileHeaderProps {
  user: any;
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-zinc-400 border border-white/5">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <User size={24} />
        )}
      </div>
      <div className="overflow-hidden">
        <h4 className="text-white font-medium truncate">
          {user?.displayName || "Usuário"}
        </h4>
        <p className="text-sm text-zinc-500 truncate">{user?.email}</p>
      </div>
    </div>
  );
}
