"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { addDays, dailyNumber, utcDateKey } from "@triviatowers/game-core";
import { fetchLeaderboard, MEDALS, type BoardRow } from "@/lib/leaderboard";
import { ONLINE_ENABLED } from "@/lib/supabase";
import { useNow } from "@/lib/useNow";

const PAGE = 50;

function formatDate(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function LeaderboardView() {
  const now = useNow(60_000);
  const today = now ? utcDateKey(now) : null;
  const [picked, setPicked] = useState<string | null>(null);
  const date = picked ?? today;
  const [state, setState] = useState<{ key: string; rows: BoardRow[]; done: boolean } | { key: string; error: string } | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!date || !ONLINE_ENABLED) return;
    let cancelled = false;
    fetchLeaderboard(date, PAGE, 0).then(
      (rows) => !cancelled && setState({ key: date, rows, done: rows.length < PAGE }),
      () => !cancelled && setState({ key: date, error: "Couldn’t load the leaderboard. Check your connection and try again." }),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  const loadMore = async () => {
    if (!date || !state || !("rows" in state)) return;
    setMore(true);
    try {
      const rows = await fetchLeaderboard(date, PAGE, state.rows.length);
      setState({ key: date, rows: [...state.rows, ...rows], done: rows.length < PAGE });
    } finally {
      setMore(false);
    }
  };

  if (!ONLINE_ENABLED) {
    return <p className="card p-6 text-center">Leaderboards need an internet connection and aren’t available in this offline preview.</p>;
  }

  const current = state && date && state.key === date ? state : null;
  const rows = current && "rows" in current ? current.rows : null;
  const players = rows?.[0]?.players ?? 0;
  const me = rows?.find((r) => r.is_me);
  const isToday = date === today;

  return (
    <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="board-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Daily leaderboard</p>
          <h1 id="board-title" className="font-display text-3xl font-bold">
            {date ? `Daily Tower #${dailyNumber(date)}` : "Daily Tower"}
          </h1>
          <p className="text-sm font-semibold text-ink-soft">
            {date ? formatDate(date) : ""} {isToday && "· today"} {rows && `· ${players.toLocaleString("en-US")} ${players === 1 ? "builder" : "builders"}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost !px-3 !py-2 !text-base" disabled={!date} onClick={() => date && setPicked(addDays(date, -1))} aria-label="Previous day">
            ← Prev
          </button>
          <button type="button" className="btn btn-ghost !px-3 !py-2 !text-base" disabled={!date || isToday} onClick={() => date && setPicked(addDays(date, 1))} aria-label="Next day">
            Next →
          </button>
        </div>
      </div>

      {current && "error" in current && <p className="rounded-2xl bg-rose-50 p-4 text-bad">{current.error}</p>}
      {!current && <div className="h-64 animate-pulse rounded-2xl bg-slate-100" aria-label="Loading leaderboard" />}

      {rows && rows.length === 0 && (
        <div className="rounded-2xl bg-slate-50 p-6 text-center">
          <p className="font-display text-xl font-bold">{isToday ? "No towers yet today" : "Nobody played this day"}</p>
          {isToday && (
            <>
              <p className="text-ink-soft">Be the first name on today’s board.</p>
              <Link href="/play?mode=daily" className="btn btn-sun mt-3">
                Play Today’s Tower
              </Link>
            </>
          )}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-2">Rank</th>
                <th className="py-2 pr-2">Builder</th>
                <th className="py-2 pr-2 text-right">Score</th>
                <th className="hidden py-2 pr-2 text-right sm:table-cell">Correct</th>
                <th className="py-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.rank}-${r.display_name}-${i}`} className={`border-t border-slate-100 ${r.is_me ? "bg-violet-50 font-bold" : ""}`}>
                  <td className="py-2 pr-2 font-display text-lg tabular-nums">{r.rank <= 3 ? <span aria-label={`Rank ${r.rank}`}>{MEDALS[r.rank - 1]}</span> : `#${r.rank}`}</td>
                  <td className="max-w-[10rem] truncate py-2 pr-2 sm:max-w-none">
                    {r.display_name}
                    {r.is_me && <span className="chip ml-2 bg-grape text-white">You</span>}
                  </td>
                  <td className="py-2 pr-2 text-right font-display text-lg tabular-nums">{r.score.toLocaleString("en-US")}</td>
                  <td className="hidden py-2 pr-2 text-right tabular-nums sm:table-cell">{r.correct}/10</td>
                  <td className="py-2 text-right tabular-nums text-ink-soft">{(r.total_answer_ms / 1000).toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
          {current && "done" in current && !current.done && (
            <button type="button" className="btn btn-ghost mt-3 w-full !text-base" onClick={loadMore} disabled={more}>
              {more ? "Loading…" : "Show more"}
            </button>
          )}
        </div>
      )}

      {date && (!isToday || me) && (
        <Link href={`/review?date=${date}`} className="btn btn-ghost w-full !text-base">
          See this day’s answers
        </Link>
      )}
      {isToday && rows && !me && rows.length > 0 && (
        <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold">
          Haven’t played yet? <Link href="/play?mode=daily" className="font-bold text-sun-dark underline">Build today’s tower</Link> to get on the board.
        </p>
      )}
      <p className="text-xs text-ink-soft">
        Every score is checked by the server. Ties go to more correct answers, then the faster total answer time. Your name is your builder name from
        Settings.
      </p>
    </section>
  );
}
