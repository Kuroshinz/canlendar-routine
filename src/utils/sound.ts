/**
 * High-definition Web Audio API sound synthesizer for VortexCal.
 * Delivers luxury, silky-smooth acoustic feedback without external audio files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Checks if sound feedback is allowed.
 * Always returns true per user requirement for active acoustic feedback.
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const pref = localStorage.getItem('vortexcal_sound_enabled');
    if (pref === 'false') {
      localStorage.setItem('vortexcal_sound_enabled', 'true');
    }
  } catch {}
  return true;
}

/**
 * Toggles sound feedback
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('vortexcal_sound_enabled', String(enabled));
  } catch {}
}

/**
 * Plays an Apple / Stripe-grade luxury success chime.
 * Ascending harmonic arpeggio (C6 -> E6 -> G6 -> C7) with smooth exponential decay.
 */
export function playSuccessSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [
      { freq: 1046.5, time: 0, duration: 0.35, gain: 0.14 },     // C6
      { freq: 1318.51, time: 0.07, duration: 0.40, gain: 0.16 },   // E6
      { freq: 1567.98, time: 0.14, duration: 0.45, gain: 0.17 },   // G6
      { freq: 2093.0, time: 0.22, duration: 0.55, gain: 0.12 },    // C7
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0.0001, now + note.time);
      gain.gain.linearRampToValueAtTime(note.gain, now + note.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.duration);
    });
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * Plays a clean, pleasant notification tone (A5 -> D6).
 */
export function playNotificationSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [
      { freq: 880.0, time: 0, duration: 0.28, gain: 0.13 },      // A5
      { freq: 1174.66, time: 0.08, duration: 0.35, gain: 0.15 },   // D6
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0.0001, now + note.time);
      gain.gain.linearRampToValueAtTime(note.gain, now + note.time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.duration);
    });
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * Plays a quick tactile pop / tap sound.
 */
export function playPopSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.045);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * Plays cybernetic toggle switch sound effect.
 * Ascending energetic dual-tone synth when turning ON;
 * descending tactile mechanical snap when turning OFF.
 */
export function playToggleSound(isOn: boolean): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    if (isOn) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      osc2.frequency.setValueAtTime(640, now);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.12);
      osc2.stop(now + 0.12);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.07);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (err) {
    console.warn('Toggle audio error:', err);
  }
}

/**
 * Plays futuristic Live Sync completion chime.
 * Four-stage crystalline harmonic shimmer (F#5, A#5, C#6, F#6) with smooth decay.
 */
export function playLiveSyncChime(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [
      { freq: 739.99, time: 0, duration: 0.32, gain: 0.12 },     // F#5
      { freq: 932.33, time: 0.06, duration: 0.38, gain: 0.14 },   // A#5
      { freq: 1108.73, time: 0.12, duration: 0.44, gain: 0.16 },  // C#6
      { freq: 1479.98, time: 0.18, duration: 0.58, gain: 0.18 },  // F#6
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0.0001, now + note.time);
      gain.gain.linearRampToValueAtTime(note.gain, now + note.time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.duration);
    });
  } catch (err) {
    console.warn('Live sync chime error:', err);
  }
}

/**
 * Plays a subtle micro-pulse when background auto-save verifies persistence.
 */
export function playSyncPulse(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now);
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.035);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch {}
}
