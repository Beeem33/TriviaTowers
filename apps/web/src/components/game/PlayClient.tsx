"use client";
import dynamic from "next/dynamic";

/** The game reads device-local state on first render, so it is rendered client-side only. */
export const PlayClient = dynamic(() => import("./GameScreen").then((m) => m.GameScreen), {
  ssr: false,
  loading: () => (
    <div className="sky-bg fixed inset-0 grid place-items-center">
      <p className="tt-bob font-display text-2xl font-bold text-white [text-shadow:0_3px_0_#3f6fd8]">Building your island…</p>
    </div>
  ),
});
