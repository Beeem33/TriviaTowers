"use client";
import { useSettings } from "@/game/settings-store";
import { useHydrated } from "@/lib/useHydrated";
import { IconMute, IconSound } from "./Icons";

export function SoundToggle({ className = "" }: { className?: string }) {
  const hydrated = useHydrated();
  const muted = useSettings((s) => s.muted);
  const set = useSettings((s) => s.set);
  const isMuted = hydrated && muted;
  return (
    <button
      type="button"
      onClick={() => set({ muted: !muted })}
      className={`btn btn-ghost h-11 w-11 !p-0 ${className}`}
      aria-pressed={isMuted}
      aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
      title={isMuted ? "Unmute" : "Mute"}
    >
      {isMuted ? <IconMute className="h-5 w-5" /> : <IconSound className="h-5 w-5" />}
    </button>
  );
}
