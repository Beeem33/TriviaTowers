"use client";
import { useEffect } from "react";
import { useReducedMotion } from "@/game/useReducedMotion";
import { unlockAudio } from "@/audio/sfx";
import { stopMusic, syncMusic } from "@/audio/music";
import { useSettings } from "@/game/settings-store";
import { DEFAULT_ISLAND_ID, ISLAND_THEMES } from "@triviatowers/game-core";

/** App-wide browser side effects: reduced-motion flag on <html>, audio unlock on first gesture. */
export function ClientEffects() {
  const reduced = useReducedMotion();
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  }, [reduced]);
  // Island theme drives the page sky.
  const islandId = useSettings((s) => s.islandId);
  useEffect(() => {
    const theme = ISLAND_THEMES[islandId] ?? ISLAND_THEMES[DEFAULT_ISLAND_ID]!;
    const root = document.documentElement.style;
    const [a, b, c, d] = theme.sky;
    root.setProperty("--sky", `linear-gradient(180deg, ${a} 0%, ${b} 38%, ${c} 62%, ${d} 100%)`);
    root.setProperty("--sky-solid", b);
    root.setProperty("--sky-ink", theme.skyInk);
  }, [islandId]);

  // Music follows settings; it starts on the first user gesture and pauses in background tabs.
  useEffect(() => {
    const unsub = useSettings.subscribe(() => syncMusic());
    const onVisibility = () => (document.hidden ? stopMusic() : syncMusic());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      syncMusic();
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
