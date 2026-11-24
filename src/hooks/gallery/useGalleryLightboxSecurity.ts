import React, { useState } from "react";
import { DecryptedImage } from "../../types";
import { submitExtraPassword } from "./lightbox/extraPasswordHandler";

interface UseGalleryLightboxSecurityProps {
  images: DecryptedImage[]; extraPassword: string | null; resetFailedAttempts: () => Promise<void>;
  registerFailedAttempt: () => Promise<{ lockedUntil: number | string | null; failedAttempts?: number }>;
  lockVault: () => void; showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  setIsExtraUnlocked: (val: boolean) => void; setSelectedImage: (url: string | null) => void;
  setSelectedImageId: (id: string | null) => void; setShowControls: (show: boolean) => void;
}

export function useGalleryLightboxSecurity(props: UseGalleryLightboxSecurityProps) {
  const [extraPasswordInput, setExtraPasswordInput] = useState("");
  const [isPromptingExtra, setIsPromptingExtra] = useState<string | null>(null);

  const handleExtraPasswordSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    await submitExtraPassword({
      input: extraPasswordInput, expected: props.extraPassword, isPromptingExtra, images: props.images,
      setIsExtraUnlocked: props.setIsExtraUnlocked, resetFailedAttempts: props.resetFailedAttempts,
      setSelectedImage: props.setSelectedImage, setSelectedImageId: props.setSelectedImageId,
      setShowControls: props.setShowControls, setIsPromptingExtra, setInput: setExtraPasswordInput,
      registerFailedAttempt: props.registerFailedAttempt, lockVault: props.lockVault, showToast: props.showToast
    });
  };
  return { extraPasswordInput, setExtraPasswordInput, isPromptingExtra, setIsPromptingExtra, handleExtraPasswordSubmit };
}
