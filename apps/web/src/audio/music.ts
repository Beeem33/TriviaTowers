/**
 * Gentle procedural background music (Web Audio, no files). A four-chord loop with a soft
 * pad, a round bass and a plucked arpeggio, scheduled a fraction of a second ahead.
 * Starts only after a user gesture; follows the mute, music and volume settings.
 */
import { useSettings } from "@/game/settings-store";
import { getContext } from "./sfx";

const BPM = 92;
const EIGHTH = 60 / BPM / 2;
const LOOKAHEAD_S = 0.3;

// C – G – Am – F, then C – Em – F – G. MIDI note numbers.
const CHORDS: number[][] = [
  [60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60],
  [60, 64, 67], [52, 55, 59], [53, 57, 60], [55, 59, 62],
];
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

let gain: GainNode | null = null;
let timer: number | null = null;
let step = 0;
let nextTime = 0;

function targetVolume(): number {
  const s = useSettings.getState();
  return s.muted || !s.music ? 0 : s.musicVolume * s.volume * 0.22;
}

function note(c: AudioContext, out: AudioNode, freq: number, start: number, dur: number, type: OscillatorType, peak: number, attack = 0.01) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(out);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function schedule(c: AudioContext, out: AudioNode) {
  while (nextTime < c.currentTime + LOOKAHEAD_S) {
    const bar = Math.floor(step / 8) % CHORDS.length;
    const beat = step % 8;
    const chord = CHORDS[bar] as number[];
    if (beat === 0) {
      chord.forEach((n) => note(c, out, midi(n), nextTime, EIGHTH * 8, "sine", 0.05, 0.35)); // pad
      note(c, out, midi((chord[0] as number) - 24), nextTime, EIGHTH * 3, "sine", 0.22); // bass
    }
    if (beat === 4) note(c, out, midi((chord[0] as number) - 24), nextTime, EIGHTH * 3, "sine", 0.16);
    // Arpeggio an octave up; rests on a few steps keep it airy.
    if (!(beat === 3 && bar % 2 === 1)) {
      note(c, out, midi((chord[ARP[beat] as number] as number) + 12), nextTime, EIGHTH * 1.6, "triangle", 0.07);
    }
    nextTime += EIGHTH;
    step++;
  }
}

export function startMusic(): void {
  const c = getContext();
  if (!c || timer !== null) return;
  if (!gain) {
    gain = c.createGain();
    gain.connect(c.destination);
  }
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.linearRampToValueAtTime(targetVolume(), c.currentTime + 2);
  nextTime = c.currentTime + 0.1;
  const out = gain;
  timer = window.setInterval(() => schedule(c, out), 100);
  schedule(c, out);
}

export function stopMusic(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  const c = getContext();
  if (c && gain) gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.2);
}

/** Applies volume/mute changes to music that is already playing. */
export function syncMusic(): void {
  const s = useSettings.getState();
  const wanted = !s.muted && s.music && s.musicVolume > 0;
  if (!wanted) {
    stopMusic();
    return;
  }
  if (timer === null) startMusic();
  const c = getContext();
  if (c && gain) gain.gain.setTargetAtTime(targetVolume(), c.currentTime, 0.15);
}
