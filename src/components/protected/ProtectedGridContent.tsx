import React from "react";
import GalleryItem from "../gallery/GalleryItem";

export default function ProtectedGridContent({ pg, extraPassword }: { pg: any; extraPassword: string | null }) {
  if (pg.loading && pg.images.length === 0) {
    return (
      <div className="flex flex-wrap gap-[2px] sm:gap-1 after:content-[''] after:flex-[10]">
        {[...Array(18)].map((_, i) => (
          <div key={i} className="h-24 sm:h-32 lg:h-40 bg-zinc-900 animate-pulse rounded-[2px]" style={{ flexGrow: 1, width: "120px" }} />
        ))}
      </div>
    );
  }
  if (pg.error) return <div className="text-red-400 p-4 bg-red-500/10 border border-red-500/15 rounded-2xl text-sm font-medium">{pg.error}</div>;
  if (pg.images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-4">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 text-zinc-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
        </div>
        <p className="text-base font-semibold text-white">Cofre Auxiliar Vazio</p>
        <p className="text-sm text-center max-w-xs text-zinc-500">Mídias que você proteger com sua chave auxiliar aparecerão neste espaço ultra seguro.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-[2px] sm:gap-1 [--gallery-row-h:118px] sm:[--gallery-row-h:152px] lg:[--gallery-row-h:188px] after:content-[''] after:grow-[99999] after:basis-0">
      {pg.images.map((img: any, index: number) => <GalleryItem key={img.id} img={img} index={index} isSelectionMode={false} selectedForDeletion={[]} securityImageId={null} isExtraUnlocked={true} extraPassword={extraPassword} hideProtectButton={true} handleImageClick={pg.handleImageClick} fetchFullMedia={pg.fetchFullResolution} setImageToDelete={pg.setImageToDelete} />)}
    </div>
  );
}

