/**
 * Pure Web Audio API Ambient Sound Synthesizer for deep focus and study sessions.
 * 100% offline, zero network requests or audio file dependencies.
 */

export type AmbientTrack = 'rain' | 'waves' | 'brownNoise' | 'forest';

export interface AmbientTrackMeta {
  id: AmbientTrack;
  labelVi: string;
  labelEn: string;
  emoji: string;
  descVi: string;
}

export const AMBIENT_TRACKS: AmbientTrackMeta[] = [
  { id: 'rain', labelVi: 'Mưa Rơi', labelEn: 'Gentle Rain', emoji: '🌧️', descVi: 'Tiếng mưa rơi êm dịu giúp dễ tập trung' },
  { id: 'waves', labelVi: 'Sóng Biển', labelEn: 'Ocean Waves', emoji: '🌊', descVi: 'Nhịp sóng biển vỗ bờ thư thái' },
  { id: 'brownNoise', labelVi: 'Tiếng Ồn Nâu', labelEn: 'Brown Noise', emoji: '🎧', descVi: 'Âm thanh trầm sâu che tạp âm xung quanh' },
  { id: 'forest', labelVi: 'Rừng Thiền', labelEn: 'Zen Forest', emoji: '🍃', descVi: 'Gió nhẹ rừng cây và chuông gió thanh tịnh' },
];

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeSourceNode: AudioNode | null = null;
let activeLfoNode: OscillatorNode | null = null;
let currentTrack: AmbientTrack = 'rain';
let currentVolume = 0.5;
let isPlaying = false;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function createNoiseBuffer(ctx: AudioContext, seconds = 5, type: 'white' | 'pink' | 'brown'): AudioBuffer {
  const bufferSize = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    // Brown noise
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Compensate gain
    }
  }
  return buffer;
}

export function startAmbientSound(track: AmbientTrack = currentTrack, volume = currentVolume): void {
  try {
    stopAmbientSound();

    const ctx = getAudioContext();
    currentTrack = track;
    currentVolume = volume;

    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    if (track === 'rain') {
      const noiseBuffer = createNoiseBuffer(ctx, 4, 'pink');
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(masterGain);
      noiseSource.start();
      activeSourceNode = noiseSource;
    } else if (track === 'waves') {
      const noiseBuffer = createNoiseBuffer(ctx, 6, 'pink');
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      const waveGain = ctx.createGain();
      waveGain.gain.setValueAtTime(0.4, ctx.currentTime);

      // LFO for surf swelling ~0.1 Hz
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.35, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(waveGain.gain);
      lfo.start();
      activeLfoNode = lfo;

      noiseSource.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(masterGain);
      noiseSource.start();
      activeSourceNode = noiseSource;
    } else if (track === 'brownNoise') {
      const noiseBuffer = createNoiseBuffer(ctx, 4, 'brown');
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(masterGain);
      noiseSource.start();
      activeSourceNode = noiseSource;
    } else if (track === 'forest') {
      const noiseBuffer = createNoiseBuffer(ctx, 5, 'pink');
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.Q.setValueAtTime(1.2, ctx.currentTime);

      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.3, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(windGain);
      windGain.connect(masterGain);
      noiseSource.start();
      activeSourceNode = noiseSource;
    }

    isPlaying = true;
  } catch (err) {
    console.warn('Cannot start ambient sound:', err);
  }
}

export function stopAmbientSound(): void {
  try {
    if (activeLfoNode) {
      activeLfoNode.stop();
      activeLfoNode.disconnect();
      activeLfoNode = null;
    }
    if (activeSourceNode && 'stop' in activeSourceNode) {
      (activeSourceNode as AudioBufferSourceNode).stop();
      activeSourceNode.disconnect();
      activeSourceNode = null;
    }
    if (masterGain) {
      masterGain.disconnect();
      masterGain = null;
    }
  } catch {
    // Ignore cleanup errors
  }
  isPlaying = false;
}

export function setAmbientVolume(volume: number): void {
  currentVolume = Math.max(0, Math.min(1, volume));
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
  }
}

export function getAmbientStatus(): { isPlaying: boolean; track: AmbientTrack; volume: number } {
  return { isPlaying, track: currentTrack, volume: currentVolume };
}
