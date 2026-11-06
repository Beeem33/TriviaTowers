import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True only on the client after hydration — guards browser-only values (localStorage, time). */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
