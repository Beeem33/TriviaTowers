/**
 * Tiny procedural sound engine (Web Audio). Every sound is synthesized at runtime,
 * so there are no audio files to license or download.
 *
 * Browsers block audio until a user gesture: the context is created lazily and
 * resumed on the first pointer/key event (see unlockAudio()).
 */
import { useSettings } from "@/game/settings-store";

export type SoundName = "correct" | "wrong" | "place" | "tick" | "start" | "victory" | "click" | "milestone" | "achievement" | "levelup";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** Shared AudioContext (also used by the music player). Null until the page has had a user gesture. */
export function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  // Don't create a context before the page has had a user gesture (autoplay policy).
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (!ctx && activation && !activation.hasBeenActive) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = getContext();
  if (c && c.state === "suspended") void c.resume();
}

export function tone(c: AudioContext, out: AudioNode, opts: { freq: number; to?: number; start: number; dur: number; type?: OscillatorType; gain?: number }) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "triangle";
  osc.frequency.setValueAtTime(opts.freq, opts.start);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, opts.start + opts.dur);
  const peak = opts.gain ?? 0.25;
  g.gain.setValueAtTime(0.0001, opts.start);
  g.gain.exponentialRampToValueAtTime(peak, opts.start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, opts.start + opts.dur);
  osc.connect(g).connect(out);
  osc.start(opts.start);
  osc.stop(opts.start + opts.dur + 0.05);
}

function noise(c: AudioContext, out: AudioNode, opts: { start: number; dur: number; freq: number; gain?: number }) {
  const len = Math.max(1, Math.floor(c.sampleRate * opts.dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.freq;
  const g = c.createGain();
  g.gain.value = opts.gain ?? 0.4;
  src.connect(filter).connect(g).connect(out);
  src.start(opts.start);
}

/** Plays a sound `delayMs` from now (lets construction sounds line up with animations). */
export function playSound(name: SoundName, delayMs = 0): void {
  const { muted, volume } = useSettings.getState();
  if (muted || volume <= 0) return;
  const c = getContext();
  if (!c || !master) return;
  if (c.state === "suspended") void c.resume();
  master.gain.value = volume * 0.8;
  const t = c.currentTime + delayMs / 1000;
  const out = master;
  switch (name) {
    case "correct":
      tone(c, out, { freq: 784, start: t, dur: 0.14, gain: 0.22 });
      tone(c, out, { freq: 1175, start: t + 0.08, dur: 0.22, gain: 0.2 });
      tone(c, out, { freq: 1568, start: t + 0.16, dur: 0.3, gain: 0.12, type: "sine" });
      break;
    case "wrong":
      tone(c, out, { freq: 330, to: 220, start: t, dur: 0.32, type: "sine", gain: 0.28 });
      tone(c, out, { freq: 247, to: 165, start: t + 0.14, dur: 0.38, type: "sine", gain: 0.2 });
      break;
    case "place":
      noise(c, out, { start: t, dur: 0.18, freq: 900, gain: 0.5 });
      tone(c, out, { freq: 140, to: 70, start: t, dur: 0.18, type: "sine", gain: 0.35 });
      break;
    case "tick":
      tone(c, out, { freq: 1320, start: t, dur: 0.06, type: "square", gain: 0.05 });
      break;
    case "click":
      tone(c, out, { freq: 660, start: t, dur: 0.05, type: "triangle", gain: 0.08 });
      break;
    case "start":
      [523, 659, 784].forEach((f, i) => tone(c, out, { freq: f, start: t + i * 0.08, dur: 0.18, gain: 0.16 }));
      break;
    case "milestone":
      [784, 988, 1175, 1568].forEach((f, i) => tone(c, out, { freq: f, start: t + i * 0.06, dur: 0.2, gain: 0.14, type: "sine" }));
      break;
    case "achievement":
      [988, 1319, 1568].forEach((f, i) => tone(c, out, { freq: f, start: t + i * 0.09, dur: 0.22, gain: 0.15, type: "triangle" }));
      tone(c, out, { freq: 1976, start: t + 0.3, dur: 0.5, gain: 0.08, type: "sine" });
      break;
    case "levelup":
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, out, { freq: f, start: t + i * 0.08, dur: 0.24, gain: 0.15 }));
      [1047, 1319, 1568].forEach((f) => tone(c, out, { freq: f, start: t + 0.45, dur: 0.9, gain: 0.08, type: "sine" }));
      break;
    case "victory":
      [523, 659, 784, 1047].forEach((f, i) => tone(c, out, { freq: f, start: t + i * 0.12, dur: 0.28, gain: 0.18 }));
      tone(c, out, { freq: 1047, start: t + 0.5, dur: 0.7, gain: 0.14, type: "sine" });
      tone(c, out, { freq: 1319, start: t + 0.5, dur: 0.7, gain: 0.1, type: "sine" });
      break;
  }
}
