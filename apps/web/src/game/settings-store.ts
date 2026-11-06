"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type MotionPref = "system" | "reduced" | "full";
export type QualityPref = "auto" | "high" | "low";

interface SettingsState {
  muted: boolean;
  volume: number;
  motion: MotionPref;
  quality: QualityPref;
  displayName: string;
  /** Set when the adaptive quality monitor decides this device needs low settings. */
  autoDowngraded: boolean;
  /** Move to the next question automatically after the answer reveal. */
  autoAdvance: boolean;
  set: (patch: Partial<Omit<SettingsState, "set">>) => void;
}

function defaultName() {
  return `Builder${Math.floor(1000 + Math.random() * 9000)}`;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      muted: false,
      volume: 0.7,
      motion: "system",
      quality: "auto",
      displayName: defaultName(),
      autoDowngraded: false,
      autoAdvance: true,
      set: (patch) => set(patch),
    }),
    {
      name: "tt.settings.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        muted: s.muted,
        volume: s.volume,
        motion: s.motion,
        quality: s.quality,
        displayName: s.displayName,
        autoDowngraded: s.autoDowngraded,
        autoAdvance: s.autoAdvance,
      }),
    },
  ),
);

/** Sanitizes a display name: letters, numbers, spaces, _ and -, 2–20 chars. */
export function cleanDisplayName(raw: string): string {
  return raw.replace(/[^\p{L}\p{N} _-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 20);
}
