/**
 * Gerenciador de Áudio da Roleta de Prêmios usando Web Audio API.
 * Produz o som característico de catraca / ticks mecânicos acelerando e desacelerando
 * em perfeita sincronia com a animação de 5 segundos da roleta.
 * Compatível com todos os navegadores modernos e mobile.
 */

import { getAudioContext } from './rouletteAudio/audioContext';
import { playTickSound } from './rouletteAudio/tickSynthesizer';
import { calculateTickSchedule } from './rouletteAudio/audioTiming';

class RouletteAudioManager {
  private isPlaying: boolean = false;
  private scheduledTimeouts: number[] = [];

  /**
   * Inicia a sequência de som do giro de 5 segundos
   */
  public playSpinSound(): void {
    this.stopSpinSound();
    this.isPlaying = true;
    const ctx = getAudioContext();
    if (!ctx) return;

    // Calcula os tempos dos ticks simulando o movimento da esteira (5s total)
    const tickTimes = calculateTickSchedule(5000);

    // Agenda cada tick
    tickTimes.forEach((time, index) => {
      const isLast = index === tickTimes.length - 1;
      const timeoutId = window.setTimeout(() => {
        if (!this.isPlaying) return;
        const currentCtx = getAudioContext();
        if (currentCtx) {
          playTickSound(currentCtx, isLast);
        }
      }, time);
      this.scheduledTimeouts.push(timeoutId);
    });
  }

  /**
   * Interrompe o som de giro imediatamente se necessário
   */
  public stopSpinSound(): void {
    this.isPlaying = false;
    this.scheduledTimeouts.forEach((id) => clearTimeout(id));
    this.scheduledTimeouts = [];
  }
}

export const rouletteAudio = new RouletteAudioManager();
