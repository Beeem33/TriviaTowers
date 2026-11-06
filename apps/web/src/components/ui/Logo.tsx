import Link from "next/link";

/** Wordmark. Brand rule: always one word — "TriviaTowers" with a capital second T. */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-4xl sm:text-5xl" : size === "sm" ? "text-xl" : "text-2xl";
  const icon = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <Link href="/" className="group inline-flex items-center gap-2 rounded-xl focus-visible:outline-4 focus-visible:outline-ink" aria-label="TriviaTowers.io home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.svg" alt="" className={`${icon} drop-shadow-sm transition-transform group-hover:-rotate-6`} />
      <span className={`font-display font-bold tracking-tight ${text} text-white [text-shadow:0_3px_0_#3f6fd8,0_6px_12px_rgba(29,39,71,0.25)]`}>
        Trivia<span className="text-[#ffd36e]">Towers</span>
        <span className="text-[0.55em] opacity-90">.io</span>
      </span>
    </Link>
  );
}
