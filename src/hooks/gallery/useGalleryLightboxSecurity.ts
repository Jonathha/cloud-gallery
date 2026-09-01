import React, { useState } from "react";
import { DecryptedImage } from "../../types";

interface UseGalleryLightboxSecurityProps {
  images: DecryptedImage[];
  extraPassword: string | null;
  resetFailedAttempts: () => Promise<void>;
  registerFailedAttempt: () => Promise<{ lockedUntil: number | string | null; failedAttempts?: number }>;
  lockVault: () => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  setIsExtraUnlocked: (val: boolean) => void;
  setSelectedImage: (url: string | null) => void;
  setSelectedImageId: (id: string | null) => void;
  setShowControls: (show: boolean) => void;
}

export function useGalleryLightboxSecurity({
  images,
  extraPassword,
  resetFailedAttempts,
  registerFailedAttempt,
  lockVault,
  showToast,
  setIsExtraUnlocked,
  setSelectedImage,
  setSelectedImageId,
  setShowControls,
}: UseGalleryLightboxSecurityProps) {
  const [extraPasswordInput, setExtraPasswordInput] = useState("");
  const [isPromptingExtra, setIsPromptingExtra] = useState<string | null>(null);

  const handleExtraPasswordSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (extraPasswordInput.trim() === extraPassword?.trim()) {
      setIsExtraUnlocked(true);
      await resetFailedAttempts();
      const img = images.find((i) => i.id === isPromptingExtra);
      if (img) {
        setSelectedImage(img.url);
        setSelectedImageId(img.id);
        setShowControls(true);
        const url = new URL(window.location.href);
        url.searchParams.set("image", img.id);
        window.history.replaceState({}, "", url);
      }
      setIsPromptingExtra(null);
      setExtraPasswordInput("");
    } else {
      const { lockedUntil } = await registerFailedAttempt();
      if (lockedUntil) {
        showToast("Muitas tentativas falhas. Cofre bloqueado temporariamente.", "error");
        setIsPromptingExtra(null);
        setExtraPasswordInput("");
        lockVault();
      } else {
        showToast("Senha extra incorreta", "error");
      }
    }
  };

  return {
    extraPasswordInput,
    setExtraPasswordInput,
    isPromptingExtra,
    setIsPromptingExtra,
    handleExtraPasswordSubmit,
  };
}
