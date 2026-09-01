/**
 * Síntese física percussiva de cliques mecânicos de roleta usando Web Audio API.
 */

export function playTickSound(ctx: AudioContext, isLastTick: boolean = false): void {
  try {
    const now = ctx.currentTime;

    // Oscilador percussivo de tick
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Ruído estalado para efeito mecânico autêntico
    const bufferSize = ctx.sampleRate * (isLastTick ? 0.04 : 0.02);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(isLastTick ? 2400 : 3200, now);
    noiseFilter.Q.setValueAtTime(3.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(isLastTick ? 0.45 : 0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (isLastTick ? 0.04 : 0.02));

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Tom tonal curto (clique do pino batendo no dente da roleta)
    osc.type = isLastTick ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isLastTick ? 520 : 780, now);
    osc.frequency.exponentialRampToValueAtTime(
      isLastTick ? 220 : 380,
      now + (isLastTick ? 0.035 : 0.02)
    );

    gain.gain.setValueAtTime(isLastTick ? 0.4 : 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isLastTick ? 0.035 : 0.02));

    osc.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + (isLastTick ? 0.04 : 0.02));

    osc.start(now);
    osc.stop(now + (isLastTick ? 0.035 : 0.02));
  } catch {
    // Ignora falhas pontuais de áudio sem quebrar a UI
  }
}
