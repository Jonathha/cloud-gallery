import React from "react";
import { AnimatePresence } from "motion/react";
import Lightbox from "../Lightbox";
import DeleteMediaModal from "../DeleteMediaModal";
import Toast from "../Toast";

export default function ProtectedModals({ pg }: { pg: any }) {
  const currentImg = pg.selectedIndex !== null ? pg.images[pg.selectedIndex] : null;
  return (
    <>
      <DeleteMediaModal isOpen={!!pg.imageToDelete} onClose={() => pg.setImageToDelete(null)} onConfirm={pg.handleDelete} title="Excluir arquivo protegido?" message="Este arquivo será removido do cofre protegido." confirmText="Excluir" cancelText="Cancelar" />
      <AnimatePresence>{pg.toast && <Toast key="toast-message" message={pg.toast.message} type={pg.toast.type} onClose={() => pg.setToast(null)} />}</AnimatePresence>
      <AnimatePresence>
        {currentImg && (
          <Lightbox
            images={pg.images} selectedImage={currentImg.originalUrl || currentImg.url} selectedImageId={currentImg.id}
            selectedImageIsVideo={currentImg.isVideo} downloadingFull={pg.downloadingFull} fullDownloadProgress={pg.fullDownloadProgress}
            imageFit={pg.imageFit} showControls={pg.showControls} isZoomed={pg.isZoomed} isFullscreen={pg.isFullscreen}
            setIsZoomed={pg.setIsZoomed} setImageFit={pg.setImageFit} setIsShareOpen={pg.setIsShareOpen} setShowControls={pg.setShowControls}
            onClose={() => { pg.closeLightbox(); pg.setIsZoomed(false); }} onNext={pg.handleNext} onPrev={pg.handlePrev}
            onToggleFullscreen={pg.toggleFullscreen} onDelete={() => pg.setImageToDelete(currentImg.id)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
