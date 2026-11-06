import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayFromParams } from "@/components/game/PlayFromParams";

export const metadata: Metadata = { title: "Play" };

/** Static shell: the game itself runs entirely client-side (no server work per visit). */
export default function PlayPage() {
  return (
    <Suspense fallback={<div className="sky-bg fixed inset-0" />}>
      <PlayFromParams />
    </Suspense>
  );
}
