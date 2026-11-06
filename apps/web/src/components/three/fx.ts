/** Minimal pub/sub so tower animations can request particle bursts without prop drilling. */
export type FxEvent =
  | { kind: "dust"; y: number; radius: number }
  | { kind: "confetti"; y: number; amount?: number }
  | { kind: "sparkle"; y: number };

type Listener = (e: FxEvent) => void;
const listeners = new Set<Listener>();

export const fx = {
  emit(e: FxEvent) {
    listeners.forEach((l) => l(e));
  },
  on(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
