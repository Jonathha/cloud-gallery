import React from "react";
import { isNativeApp } from "../utils/isNativeApp";
import { useAuth } from "../contexts/AuthContext";
import { useProtectedGallery } from "../hooks/protected/useProtectedGallery";
import ProtectedSetupScreen from "./protected/ProtectedSetupScreen";
import ProtectedUnlockScreen from "./protected/ProtectedUnlockScreen";
import GalleryItem from "./GalleryItem";
import Lightbox from "./Lightbox";
import DeleteMediaModal from "./DeleteMediaModal";
import Toast from "./Toast";
import { AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

interface ProtectedGalleryProps {
  onBack?: () => void;
  onLightboxToggle?: (isOpen: boolean) => void;
}

export default function ProtectedGallery({ onLightboxToggle }: ProtectedGalleryProps) {
  const isApp = isNativeApp();
  const { extraPassword } = useAuth();
  const pg = useProtectedGallery(onLightboxToggle);

  if (!extraPassword) {
    return <ProtectedSetupScreen />;
  }

  const showUnlockOverlay = !pg.isUnlocked;

  return (
    <>
      {showUnlockOverlay && (
        <div className="absolute inset-0 z-30 bg-[#050505] flex flex-col">
          <ProtectedUnlockScreen
            passwordInput={pg.passwordInput}
            setPasswordInput={pg.setPasswordInput}
            passwordError={pg.passwordError}
            setPasswordError={pg.setPasswordError}
            onUnlockSubmit={pg.handleUnlockSubmit}
            isLoading={pg.isLoading}
          />
        </div>
      )}

      {/* Header Unificado para PC / Mobile */}
      <header 
        style={{ paddingTop: isApp ? '2.5rem' : 'calc(0.5rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.5rem' }}
        className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-3 sm:px-6 min-h-14 sm:min-h-20 flex items-center justify-between shrink-0"
      >
        <div>
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Fotos Protegidas
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-full font-semibold uppercase tracking-wider">Cofre Ativo</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium">
            {pg.images.length} mídias criptografadas
          </p>
        </div>
      </header>

      {/* Grid de Imagens com Layout Idêntico à Galeria Principal */}
      <main className="max-w-7xl mx-auto p-[2px] sm:p-3 pb-28 sm:pb-32 w-full flex-1 overflow-y-auto scrollbar-thin">
        {pg.loading && pg.images.length === 0 ? (
          <div className="flex flex-wrap gap-[2px] sm:gap-1 after:content-[''] after:flex-[10]">
            {[...Array(18)].map((_, i) => (
              <div
                key={i}
                className="h-24 sm:h-32 lg:h-40 bg-zinc-900 animate-pulse rounded-[2px]"
                style={{ flexGrow: 1, width: "120px" }}
              />
            ))}
          </div>
        ) : pg.error ? (
          <div className="text-red-400 p-4 bg-red-500/10 border border-red-500/15 rounded-2xl text-sm font-medium">
            {pg.error}
          </div>
        ) : pg.images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-4">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 text-zinc-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-white">Cofre Auxiliar Vazio</p>
            <p className="text-sm text-center max-w-xs text-zinc-500">
              Mídias que você proteger com sua chave auxiliar aparecerão neste espaço ultra seguro.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-[2px] sm:gap-1 after:content-[''] after:flex-[10]">
            {pg.images.map((img, index) => (
              <GalleryItem
                key={img.id}
                img={img}
                index={index}
                isSelectionMode={false}
                selectedForDeletion={[]}
                securityImageId={null}
                isExtraUnlocked={true}
                extraPassword={extraPassword}
                hideProtectButton={true}
                handleImageClick={pg.handleImageClick}
                fetchFullMedia={pg.fetchFullResolution}
                setImageToDelete={pg.setImageToDelete}
              />
            ))}
          </div>
        )}

        <DeleteMediaModal
          isOpen={!!pg.imageToDelete}
          onClose={() => pg.setImageToDelete(null)}
          onConfirm={pg.handleDelete}
          title="Excluir arquivo protegido?"
          message="Este arquivo será removido do cofre protegido."
          confirmText="Excluir"
          cancelText="Cancelar"
        />

        <AnimatePresence>
          {pg.toast && (
            <Toast
              key="toast-message"
              message={pg.toast.message}
              type={pg.toast.type}
              onClose={() => pg.setToast(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pg.selectedIndex !== null && pg.images[pg.selectedIndex] && (
            <Lightbox
              images={pg.images}
              selectedImage={pg.images[pg.selectedIndex].originalUrl || pg.images[pg.selectedIndex].url}
              selectedImageId={pg.images[pg.selectedIndex].id}
              selectedImageIsVideo={pg.images[pg.selectedIndex].isVideo}
              downloadingFull={pg.downloadingFull}
              fullDownloadProgress={pg.fullDownloadProgress}
              imageFit={pg.imageFit}
              showControls={pg.showControls}
              isZoomed={pg.isZoomed}
              isFullscreen={pg.isFullscreen}
              setIsZoomed={pg.setIsZoomed}
              setImageFit={pg.setImageFit}
              setIsShareOpen={pg.setIsShareOpen}
              setShowControls={pg.setShowControls}
              onClose={() => {
                pg.closeLightbox();
                pg.setIsZoomed(false);
              }}
              onNext={pg.handleNext}
              onPrev={pg.handlePrev}
              onToggleFullscreen={pg.toggleFullscreen}
              onDelete={() => pg.setImageToDelete(pg.images[pg.selectedIndex!].id)}
            />
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
