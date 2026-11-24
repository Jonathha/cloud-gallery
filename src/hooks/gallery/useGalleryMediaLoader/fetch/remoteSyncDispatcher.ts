export function dispatchRemoteSync(
  remoteList: any[], newOrAltered: any[], token: string,
  pendingSyncRef: any, setCloudMediaCount: (v: number) => void,
  setShowDownloadPrompt: (v: boolean) => void, executeBackgroundSync: (items: any[], t: string) => Promise<void>
) {
  if (navigator.onLine && remoteList.length > 0) {
    const toSync = newOrAltered.filter((img) => !img.isChunked && (!img.ciphertext || img.ciphertext === "chunked_vault_data"));
    pendingSyncRef.current = { items: toSync, token };
    setCloudMediaCount(remoteList.length);
    const pref = localStorage.getItem('gallery_download_pref') || sessionStorage.getItem('gallery_download_pref');
    if (pref === 'full') {
      if (toSync.length > 0) executeBackgroundSync(toSync, token);
    } else if (pref !== 'thumbnails_only') {
      setShowDownloadPrompt(true);
    }
  }
}
