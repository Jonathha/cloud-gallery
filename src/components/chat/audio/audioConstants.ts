export const memoryAudioCache = new Map<string, string>();

let activeAudioElement: HTMLAudioElement | null = null;
let activePauseCallback: (() => void) | null = null;

export function setActiveAudio(audio: HTMLAudioElement | null, pauseCb: (() => void) | null) {
  if (activeAudioElement && activeAudioElement !== audio && activePauseCallback) {
    try {
      activePauseCallback();
    } catch {}
  }
  activeAudioElement = audio;
  activePauseCallback = pauseCb;
}

export function getActiveAudioElement() {
  return activeAudioElement;
}
