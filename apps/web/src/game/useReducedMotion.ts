"use client";
import { useSyncExternalStore } from "react";
import { useSettings } from "./settings-store";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia?.(QUERY);
  mq?.addEventListener?.("change", cb);
  return () => mq?.removeEventListener?.("change", cb);
}

/** Combines the OS preference with the in-game override. */
export function useReducedMotion(): boolean {
  const motion = useSettings((s) => s.motion);
  const system = useSyncExternalStore(subscribe, () => window.matchMedia?.(QUERY).matches === true, () => false);
  if (motion === "reduced") return true;
  if (motion === "full") return false;
  return system;
}
