import React from "react";
import { Image as ImageIcon, Trash2, Settings, Sliders } from "lucide-react";
import { motion } from "motion/react";
import { isNativeApp, isMobileDevice } from "../utils/isNativeApp";

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isSelectionMode: boolean;
  selectedImageId: string | null;
  isProtectedLightboxOpen: boolean;
  setIsSelectionMode: (val: boolean) => void;
  setSelectedForDeletion: (val: any[]) => void;
  isAdmin?: boolean;
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
}: MobileBottomNavProps) {
  const isApp = isNativeApp();
  const isMobile = isMobileDevice();

  if (isSelectionMode || selectedImageId || isProtectedLightboxOpen) {
    return null;
  }

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
      icon: Trash2,
      onClick: () => {
        setActiveTab("trash");
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

  return (
    <div
      style={{
        paddingBottom: isApp
          ? "1.6rem"
          : isMobile
            ? "calc(1rem + env(safe-area-inset-bottom, 0px))"
            : "calc(0.6rem + env(safe-area-inset-bottom, 0px))",
      }}
      className="
        lg:hidden
        fixed bottom-0 left-0 right-0
        z-[100]
        px-4
        pb-2
      "
    >
      <div
        className="
          mx-auto
          max-w-sm
          h-[64px]
          rounded-2xl
          bg-[#0a0a0d]/95
          backdrop-blur-2xl
          border border-white/10
          shadow-2xl
          flex items-center justify-around
          px-2
        "
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              onClick={item.onClick}
              whileTap={{ scale: 0.92 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 25,
              }}
              className="
                relative
                flex-1
                h-full
                flex
                items-center
                justify-center
                cursor-pointer
                outline-none
                select-none
              "
            >
              <div
                className="
                  relative
                  flex
                  flex-col
                  items-center
                  justify-center
                  gap-1
                  w-[56px]
                  h-[46px]
                "
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-active"
                    className="
                      absolute
                      inset-0
                      rounded-xl
                      bg-white/10
                      border
                      border-white/10
                    "
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 30,
                    }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className={`
                    relative
                    z-10
                    transition-colors
                    ${
                      isActive
                        ? "text-white"
                        : "text-zinc-400"
                    }
                  `}
                />
                <span
                  className={`
                    relative
                    z-10
                    text-[10px]
                    leading-none
                    tracking-tight
                    ${
                      isActive
                        ? "text-white font-medium"
                        : "text-zinc-400 font-normal"
                    }
                  `}
                >
                  {item.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
