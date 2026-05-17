// Web Audio synthesis for tiny crab footstep + eat sounds. No assets ship;
// each sound is built on the fly with a few oscillators + an envelope.
//
// Mobile Safari starts AudioContext in 'suspended' and only allows playback
// after a user gesture. `unlockAudio()` should be called from any onClick /
// onTap handler — it's a no-op after the first successful resume.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: Safari prefix
      const Ctor: typeof AudioContext = (window as any).AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function unlockAudio(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {
      /* ignore — best-effort */
    });
  }
}

export function isAudioReady(): boolean {
  const ctx = getCtx();
  return !!ctx && ctx.state === 'running';
}

// Soft muffled tap. Pitch jitters per step so consecutive footsteps don't
// sound robotic. Volume defaults to barely-audible — meant to feel ambient.
export function playFootstep(volume = 0.035): void {
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700 + Math.random() * 200;
  filter.Q.value = 1;
  osc.type = 'sine';
  osc.frequency.value = 160 + Math.random() * 80;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

// Sparkle on eat — short 2-tone chime.
export function playSparkle(volume = 0.05): void {
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  for (const [f, dt] of [
    [880, 0],
    [1320, 0.04],
    [1760, 0.08],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, now + dt);
    gain.gain.linearRampToValueAtTime(volume, now + dt + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dt + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + dt);
    osc.stop(now + dt + 0.3);
  }
}

// Soft "plop" for food landing in water.
export function playSplash(volume = 0.05): void {
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(380, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.25);
}
