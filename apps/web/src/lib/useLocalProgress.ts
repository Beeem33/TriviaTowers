"use client";
import { useSyncExternalStore } from "react";
import { getProgressSnapshot, subscribeProgress, type LocalProgress } from "./progress";

/** Local progress, or null during server render / hydration. Updates live after recordMatch(). */
export function useLocalProgress(): LocalProgress | null {
  return useSyncExternalStore(subscribeProgress, getProgressSnapshot, () => null);
}
