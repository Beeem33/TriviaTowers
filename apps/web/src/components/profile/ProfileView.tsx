"use client";
import Link from "next/link";
import {
  ACHIEVEMENTS,
  COSMETICS,
  ISLAND_THEMES,
  TOWER_SKINS,
  achievementById,
  isUnlocked,
  levelProgress,
  towerSeed,
  type CosmeticItem,
  type PlayerTotals,
} from "@triviatowers/game-core";
import { useLocalProgress } from "@/lib/useLocalProgress";
import { dailyStreak } from "@/lib/progress";
import { useSettings } from "@/game/settings-store";
import { useReducedMotion } from "@/game/useReducedMotion";
import { SceneView } from "@/components/three/SceneView";
import { playSound } from "@/audio/sfx";
import { ProgressTransfer } from "@/components/ui/ProgressTransfer";

function unlockLabel(item: CosmeticItem): string {
  switch (item.unlock.type) {
    case "free":
      return "Free";
    case "level":
      return `Reach level ${item.unlock.level}`;
    case "achievement":
      return `Earn “${achievementById(item.unlock.id)?.name ?? item.unlock.id}”`;
  }
}

function SkinSwatch({ id }: { id: string }) {
  const s = TOWER_SKINS[id]!;
  return (
    <div className="flex h-20 flex-col items-center justify-end" aria-hidden>
      <div className="h-0 w-0 border-x-[18px] border-b-[18px] border-x-transparent" style={{ borderBottomColor: s.roof }} />
      {[s.brick, s.timber, s.stone].map((c, i) => (
        <div key={i} className="flex h-4 w-8 items-center justify-center border-b" style={{ background: c, borderColor: s.trim }}>
          <span className="h-2 w-1.5 rounded-t-full" style={{ background: i === 1 ? s.windowGlow : s.window }} />
        </div>
      ))}
      <div className="h-2 w-11 rounded-sm" style={{ background: s.foundation }} />
    </div>
  );
}

function IslandSwatch({ id }: { id: string }) {
  const t = ISLAND_THEMES[id]!;
  return (
    <div
      className="flex h-20 w-full items-end justify-center rounded-xl pb-2"
      style={{ background: `linear-gradient(180deg, ${t.sky[0]}, ${t.sky[2]})` }}
      aria-hidden
    >
      <div className="flex flex-col items-center">
        <div className="mb-[-2px] flex gap-1">
          <span className="h-3 w-3 rounded-full" style={{ background: t.leaves[0] }} />
          <span className="h-4 w-3 rounded-full" style={{ background: t.leaves[1] }} />
        </div>
        <div className="h-3 w-20 rounded-t-md" style={{ background: t.grass }} />
        <div className="h-3 w-16 rounded-b-full" style={{ background: t.rock }} />
      </div>
    </div>
  );
}

function CollectionGrid({ kind, level, achievements }: { kind: "skin" | "island"; level: number; achievements: Set<string> }) {
  const equipped = useSettings((s) => (kind === "skin" ? s.skinId : s.islandId));
  const set = useSettings((s) => s.set);
  const items = COSMETICS.filter((c) => c.kind === kind);
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => {
        const open = isUnlocked(item, { level, achievements });
        const on = equipped === item.id;
        return (
          <li key={item.id} className={`flex flex-col items-center gap-2 rounded-2xl p-3 ${on ? "bg-violet-100 ring-2 ring-grape" : "bg-slate-50"}`}>
            <div className={open ? "" : "opacity-40 grayscale"}>{kind === "skin" ? <SkinSwatch id={item.id} /> : <IslandSwatch id={item.id} />}</div>
            <p className="text-center font-display text-sm font-bold leading-tight">{item.name}</p>
            {on ? (
              <span className="chip bg-grape text-white">Equipped</span>
            ) : open ? (
              <button
                type="button"
                className="btn btn-ghost !px-3 !py-1 !text-sm"
                onClick={() => {
                  set(kind === "skin" ? { skinId: item.id } : { islandId: item.id });
                  playSound("click");
                }}
              >
                Equip
              </button>
            ) : (
              <span className="chip bg-slate-200 text-ink-soft">🔒 {unlockLabel(item)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ProfileView() {
  const progress = useLocalProgress();
  const name = useSettings((s) => s.displayName);
  const reduced = useReducedMotion();

  if (!progress) return <div className="card h-96 animate-pulse" />;

  const lp = levelProgress(progress.xp);
  const unlocked = new Set(Object.keys(progress.achievements));
  const streak = dailyStreak(progress);
  const totals: PlayerTotals = {
    games: progress.lifetime.games,
    correct: progress.lifetime.correct,
    answered: progress.lifetime.answered,
    dailyStreak: streak,
    endlessBestFloors: progress.endlessBest?.floors ?? 0,
    dailiesCompleted: Object.keys(progress.daily).length,
  };
  const accuracy = Math.round((progress.lifetime.correct / Math.max(1, progress.lifetime.answered)) * 100);
  const stats: [string, string | number][] = [
    ["Games", progress.lifetime.games],
    ["Accuracy", `${accuracy}%`],
    ["Tallest tower", `${progress.lifetime.highestTower} fl`],
    ["Daily streak", `${streak} 🔥`],
    ["Endless best", `${progress.endlessBest?.floors ?? 0} fl`],
    ["Achievements", `${unlocked.size}/${ACHIEVEMENTS.length}`],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-6">
        <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="builder-name">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-grape font-display text-3xl font-bold text-white" aria-hidden>
              {lp.level}
            </div>
            <div className="min-w-0">
              <h1 id="builder-name" className="truncate font-display text-3xl font-bold">
                {name}
              </h1>
              <p className="font-semibold text-ink-soft">
                Level {lp.level} · {lp.title}
              </p>
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs font-bold text-ink-soft">
              <span>{progress.xp.toLocaleString("en-US")} XP</span>
              <span className="tabular-nums">
                {lp.span - lp.into} XP to level {lp.level + 1}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Progress to next level" aria-valuemin={0} aria-valuemax={lp.span} aria-valuenow={lp.into}>
              <div className="h-full rounded-full bg-grape" style={{ width: `${Math.round(lp.fraction * 100)}%` }} />
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-soft sm:text-xs">{label}</dt>
                <dd className="font-display text-lg font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-ink-soft">
            Saved on this device. Change your builder name in Settings. Earn XP by playing: 10 per correct answer, 2 per question, plus bonuses for
            Daily Towers and perfect rounds.
          </p>
        </section>

        <section className="card space-y-3 p-5 sm:p-6" aria-labelledby="move-title">
          <h2 id="move-title" className="font-display text-2xl font-bold">
            Move your progress
          </h2>
          <ProgressTransfer />
        </section>

        <section className="card overflow-hidden" aria-label="Your tower and island">
          <div className="relative h-72 sky-bg">
            <SceneView
              mode="home"
              floors={6}
              seed={towerSeed("profile-preview")}
              reducedMotion={reduced}
              interactive
              towerKey="profile"
              label="Preview of your equipped tower skin and island theme"
            />
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="card space-y-3 p-5 sm:p-6" aria-labelledby="skins-title">
          <h2 id="skins-title" className="font-display text-2xl font-bold">
            Tower skins
          </h2>
          <CollectionGrid kind="skin" level={lp.level} achievements={unlocked} />
        </section>
        <section className="card space-y-3 p-5 sm:p-6" aria-labelledby="islands-title">
          <h2 id="islands-title" className="font-display text-2xl font-bold">
            Islands
          </h2>
          <CollectionGrid kind="island" level={lp.level} achievements={unlocked} />
        </section>
        <section className="card space-y-3 p-5 sm:p-6" aria-labelledby="ach-title">
          <h2 id="ach-title" className="font-display text-2xl font-bold">
            Achievements
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const done = unlocked.has(a.id);
              const prog = !done && a.progress ? a.progress(totals) : null;
              return (
                <li key={a.id} className={`flex items-start gap-3 rounded-2xl p-3 ${done ? "bg-amber-50" : "bg-slate-50"}`}>
                  <span className={`text-3xl ${done ? "" : "opacity-40 grayscale"}`} aria-hidden>
                    {a.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold leading-tight">
                      {a.name} {done && <span className="sr-only">(unlocked)</span>}
                    </p>
                    <p className="text-xs text-ink-soft">{a.description}</p>
                    {done && (
                      <p className="mt-0.5 text-[11px] font-bold text-sun-dark">
                        Unlocked {new Date(progress.achievements[a.id]!).toLocaleDateString()}
                      </p>
                    )}
                    {prog && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-sun" style={{ width: `${Math.min(100, Math.round((prog[0] / prog[1]) * 100))}%` }} />
                        </div>
                        <span className="text-[11px] font-bold tabular-nums text-ink-soft">
                          {Math.min(prog[0], prog[1])}/{prog[1]}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <Link href="/play?mode=quick" className="btn btn-sun w-full">
          Earn more XP — play Quick Build
        </Link>
      </div>
    </div>
  );
}
