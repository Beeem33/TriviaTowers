import type { ChallengeClaim } from "@/lib/challenge";

/** Shown when someone opens a friend's challenge link. The numbers are the friend's own claim. */
export function ChallengeBanner({ claim }: { claim: ChallengeClaim }) {
  return (
    <div className="tt-rise flex items-center gap-3 rounded-3xl bg-grape px-4 py-3 text-white shadow-lg">
      <span className="text-3xl" aria-hidden>⚔️</span>
      <p className="text-sm leading-snug">
        <span className="font-display text-base font-bold">{claim.name}</span> challenged you!{" "}
        They built <b>{claim.floors} {claim.floors === 1 ? "floor" : "floors"}</b> with <b>{claim.score.toLocaleString("en-US")} points</b>
        {claim.daily ? <> on Daily Tower #{claim.daily}</> : null}. Can you build higher?
      </p>
    </div>
  );
}
