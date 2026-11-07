"use client";
import Link from "next/link";
import { levelForXp } from "@triviatowers/game-core";
import { useLocalProgress } from "@/lib/useLocalProgress";

export function LevelBadge() {
  const p = useLocalProgress();
  if (!p) return null;
  const level = levelForXp(p.xp);
  return (
    <Link href="/profile" className="btn btn-ghost h-11 !px-3 !text-base" aria-label={`Level ${level}. Open your profile`} title="Your profile">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-grape text-xs text-white">{level}</span>
      <span className="hidden sm:inline">Lv {level}</span>
    </Link>
  );
}
