import { DecryptedImage } from "../../../types";

export async function submitExtraPassword({
  input, expected, isPromptingExtra, images, setIsExtraUnlocked, resetFailedAttempts,
  setSelectedImage, setSelectedImageId, setShowControls, setIsPromptingExtra,
  setInput, registerFailedAttempt, lockVault, showToast
}: {
  input: string; expected: string | null; isPromptingExtra: string | null; images: DecryptedImage[];
  setIsExtraUnlocked: (v: boolean) => void; resetFailedAttempts: () => Promise<void>;
  setSelectedImage: (u: string | null) => void; setSelectedImageId: (id: string | null) => void;
  setShowControls: (s: boolean) => void; setIsPromptingExtra: (id: string | null) => void;
  setInput: (s: string) => void; registerFailedAttempt: () => Promise<any>;
  lockVault: () => void; showToast: (m: string, t?: any) => void;
}) {
  if (input.trim() === expected?.trim()) {
    setIsExtraUnlocked(true);
    await resetFailedAttempts();
    const img = images.find((i) => i.id === isPromptingExtra);
    if (img) {
      setSelectedImage(img.url); setSelectedImageId(img.id); setShowControls(true);
      const url = new URL(window.location.href); url.searchParams.set("image", img.id); window.history.replaceState({}, "", url);
    }
    setIsPromptingExtra(null); setInput("");
  } else {
    const { lockedUntil } = await registerFailedAttempt();
    if (lockedUntil) {
      showToast("Muitas tentativas falhas. Cofre bloqueado temporariamente.", "error");
      setIsPromptingExtra(null); setInput(""); lockVault();
    } else {
      showToast("Senha extra incorreta", "error");
    }
  }
}
