import React from "react";
import { Image as ImageIcon, Settings, Sliders, MessageSquare } from "lucide-react";
import TrashIcon from "./icons/TrashIcon";

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isSelectionMode: boolean;
  selectedImageId: string | null;
  isProtectedLightboxOpen: boolean;
  setIsSelectionMode: (val: boolean) => void;
  setSelectedForDeletion: (val: any[]) => void;
  isAdmin?: boolean;
  settingsSubTab?: string;
}

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  isSelectionMode,
  selectedImageId,
  isProtectedLightboxOpen,
  setIsSelectionMode,
  setSelectedForDeletion,
  isAdmin = false,
  settingsSubTab = 'menu',
}: MobileBottomNavProps) {
  // Mantida montada e escondida com transição (antes retornava null e sumia de uma vez).
  const isHidden =
    isSelectionMode ||
    !!selectedImageId ||
    isProtectedLightboxOpen ||
    (activeTab === "settings" && !!settingsSubTab && settingsSubTab !== "menu") ||
    activeTab === "chat";

  const navItems = [
    {
      id: "gallery",
      label: "Galeria",
      icon: ImageIcon,
      onClick: () => {
        setActiveTab("gallery");
        setIsSelectionMode(false);
        setSelectedForDeletion([]);
      },
      show: true,
    },
    {
      id: "trash",
      label: "Lixeira",
      icon: TrashIcon,
      onClick: () => {
        setActiveTab("trash");
        setIsSelectionMode(false);
      },
      show: true,
    },
    {
      id: "chat",
      label: "Chat",
      icon: MessageSquare,
      onClick: () => {
        setActiveTab("chat");
        setIsSelectionMode(false);
      },
      show: true,
    },
    {
      id: "settings",
      label: "Config",
      icon: Settings,
      onClick: () => {
        setActiveTab("settings");
        setIsSelectionMode(false);
      },
      show: true,
    },
    {
      id: "admin",
      label: "Admin",
      icon: Sliders,
      onClick: () => {
        setActiveTab("admin");
        setIsSelectionMode(false);
      },
      show: isAdmin,
    },
  ].filter((item) => item.show);

  const activeIndex = navItems.findIndex((item) => item.id === activeTab);

  return (
    <div
      id="mobile-bottom-nav"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
      }}
      aria-hidden={isHidden}
      className={`lg:hidden fixed bottom-0 inset-x-0 z-[100] px-3 sm:px-6 pointer-events-none transition-[transform,opacity,visibility] duration-200 ease-out ${
        isHidden ? "translate-y-4 opacity-0 invisible" : "translate-y-0 opacity-100 visible"
      }`}
    >
      <div
        className="
          pointer-events-auto
          mx-auto
          w-full
          max-w-md
          rounded-full
          bg-[#0a0a0d]
          border border-white/[0.08]
          shadow-2xl
          flex items-stretch justify-between
          p-1.5
          gap-1
          relative
        "
      >
        {/* Pílula ativa única que desliza entre os itens (mesmo visual do fundo ativo anterior) */}
        <span
          aria-hidden="true"
          className="absolute rounded-full bg-white/15 pointer-events-none transition-[transform,opacity] duration-200 ease-out"
          style={{
            top: "0.375rem",
            bottom: "0.375rem",
            left: "0.375rem",
            width: `calc((100% - 0.75rem - ${(navItems.length - 1) * 0.25}rem) / ${navItems.length})`,
            transform: `translateX(calc(${Math.max(activeIndex, 0)} * (100% + 0.25rem)))`,
            opacity: activeIndex >= 0 ? 1 : 0,
          }}
        />
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`
                relative
                flex-1
                min-w-0
                py-2
                px-1
                rounded-full
                flex
                flex-col
                items-center
                justify-center
                gap-1
                cursor-pointer
                outline-none
                select-none
                transition-[color,background-color,transform]
                duration-150
                active:scale-95
                touch-manipulation
                ${
                  isActive
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                }
              `}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.25 : 1.75}
                className="shrink-0 transition-colors"
              />
              <span
                className={`
                  text-[10px]
                  sm:text-[11px]
                  leading-none
                  tracking-tight
                  truncate
                  max-w-full
                  ${
                    isActive
                      ? "text-white font-medium"
                      : "text-zinc-400 font-normal"
                  }
                `}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
