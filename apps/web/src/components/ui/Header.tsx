import Link from "next/link";
import { Logo } from "./Logo";
import { SoundToggle } from "./SoundToggle";
import { SettingsButton } from "./SettingsDialog";
import { LevelBadge } from "./LevelBadge";

const NAV = [
  { href: "/play?mode=daily", label: "Play" },
  { href: "/friends", label: "Friends" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/profile", label: "Profile" },
];

const INFO = [
  { href: "/how-to-play", label: "How to Play" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Header() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Logo />
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-xl px-4 py-2 font-display text-lg font-semibold text-white [text-shadow:0_2px_0_rgba(63,111,216,0.7)] transition hover:bg-white/20 focus-visible:outline-4 focus-visible:outline-ink">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <LevelBadge />
        <SoundToggle />
        <SettingsButton />
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="on-sky relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 pt-12 text-sm sm:px-6">
      <nav aria-label="Footer" className="mb-3 flex flex-wrap gap-x-5 gap-y-2 font-bold md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>
        ))}
      </nav>
      <nav aria-label="Information" className="mb-3 flex flex-wrap gap-x-5 gap-y-2 font-bold">
        {INFO.map((n) => (
          <Link key={n.href} href={n.href} className="hover:underline">{n.label}</Link>
        ))}
      </nav>
      <p>
        © {new Date().getFullYear()} TriviaTowers.io · Daily trivia, one floor at a time.
        <span className="ml-1 opacity-80">Early preview.</span>
      </p>
    </footer>
  );
}
