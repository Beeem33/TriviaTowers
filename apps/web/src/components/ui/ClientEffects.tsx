"use client";
import { useEffect } from "react";
import { useReducedMotion } from "@/game/useReducedMotion";
import { unlockAudio } from "@/audio/sfx";

/** App-wide browser side effects: reduced-motion flag on <html>, audio unlock on first gesture. */
export function ClientEffects() {
  const reduced = useReducedMotion();
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  }, [reduced]);
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
  return null;
}
