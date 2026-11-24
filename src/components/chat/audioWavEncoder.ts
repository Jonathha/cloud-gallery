// Normalização de volume (baseada em RMS, não em pico)
const GATE_LEVEL = 0.01;        // amostras abaixo disso são ignoradas no cálculo do volume médio
const MIN_SIGNAL_PEAK = 0.02;   // pico abaixo disso = praticamente silêncio/ruído: não amplifica
const TARGET_RMS = 0.15;        // ~ -16 dBFS, volume claro de mensagem de voz
const MAX_GAIN = 10;            // limite de amplificação (+20 dB) para não estourar chiado
const SOFT_LIMIT_START = 0.9;   // a partir daqui os picos são suavizados em vez de cortados

/**
 * Em alguns celulares o microfone de voz fica em um canal e o outro é mudo.
 * Se isso acontecer, devolve os dados do canal com sinal; caso contrário devolve null
 * (e o chamador usa o downmix padrão).
 */
export function pickVoiceChannel(audioBuffer: AudioBuffer): Float32Array | null {
  const numChannels = audioBuffer.numberOfChannels;
  if (numChannels <= 1) return null;

  const numSamples = audioBuffer.length;
  const channels: Float32Array[] = [];
  const peaks: number[] = [];
  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    channels.push(data);
    let peak = 0;
    for (let i = 0; i < numSamples; i += 10) {
      const val = Math.abs(data[i]);
      if (val > peak) peak = val;
    }
    peaks.push(peak);
  }

  const maxPeakFound = Math.max(...peaks);
  // Se um canal tem sinal e outro é praticamente mudo (< 5% do pico)
  if (maxPeakFound > 0.005 && peaks.some(p => p < maxPeakFound * 0.05)) {
    return channels[peaks.indexOf(maxPeakFound)];
  }
  return null;
}

function softLimit(x: number): number {
  const a = Math.abs(x);
  if (a <= SOFT_LIMIT_START) return x;
  const headroom = 1 - SOFT_LIMIT_START;
  const y = SOFT_LIMIT_START + headroom * Math.tanh((a - SOFT_LIMIT_START) / headroom);
  return x < 0 ? -y : y;
}

/**
 * Converts an AudioBuffer into a 16-bit Mono PCM WAV Blob
 * matching exact server parser requirements.
 */
export function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numOfChan = 1; // mono
  const sampleRate = Math.max(8000, Math.min(48000, Math.round(audioBuffer.sampleRate)));
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset++, str.charCodeAt(i));
    }
  };

  writeString('RIFF');
  view.setUint32(offset, length - 8, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4; // Subchunk1Size (16 for PCM)
  view.setUint16(offset, 1, true); offset += 2;  // AudioFormat (1 for PCM)
  view.setUint16(offset, 1, true); offset += 2;  // NumChannels (1 mono)
  view.setUint32(offset, sampleRate, true); offset += 4; // SampleRate
  view.setUint32(offset, sampleRate * 2, true); offset += 4; // ByteRate
  view.setUint16(offset, 2, true); offset += 2;  // BlockAlign
  view.setUint16(offset, 16, true); offset += 2; // BitsPerSample
  writeString('data');
  view.setUint32(offset, length - offset - 4, true); offset += 4;

  // Extrai e combina os canais disponíveis (downmix inteligente mono)
  const numChannels = audioBuffer.numberOfChannels;
  const numSamples = audioBuffer.length;
  const monoSamples = new Float32Array(numSamples);

  if (numChannels <= 1) {
    monoSamples.set(audioBuffer.getChannelData(0));
  } else {
    const voiceChannel = pickVoiceChannel(audioBuffer);
    if (voiceChannel) {
      monoSamples.set(voiceChannel);
    } else {
      // Downmix padrão somando todos os canais
      for (let i = 0; i < numSamples; i++) {
        let sum = 0;
        for (let c = 0; c < numChannels; c++) {
          sum += audioBuffer.getChannelData(c)[i];
        }
        monoSamples[i] = sum / numChannels;
      }
    }
  }

  // Normalização por volume médio (RMS): um estalo isolado não deixa mais a voz baixa,
  // e áudio quase mudo não é amplificado até virar chiado.
  let peak = 0;
  let gatedSumSq = 0;
  let gatedCount = 0;
  for (let i = 0; i < numSamples; i++) {
    const abs = Math.abs(monoSamples[i]);
    if (abs > peak) peak = abs;
    if (abs > GATE_LEVEL) {
      gatedSumSq += abs * abs;
      gatedCount++;
    }
  }

  let gain = 1;
  if (peak >= MIN_SIGNAL_PEAK && gatedCount > 0) {
    const rms = Math.sqrt(gatedSumSq / gatedCount);
    if (rms > 0 && rms < TARGET_RMS) {
      gain = Math.min(TARGET_RMS / rms, MAX_GAIN);
    }
  }

  for (let i = 0; i < numSamples; i++) {
    const amplified = monoSamples[i] * gain;
    const s = Math.max(-1, Math.min(1, gain > 1 ? softLimit(amplified) : amplified));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function formatRecordingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
