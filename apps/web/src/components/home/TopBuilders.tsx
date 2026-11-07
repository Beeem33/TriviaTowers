"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchLeaderboard, MEDALS, type BoardRow } from "@/lib/leaderboard";
import { ONLINE_ENABLED } from "@/lib/supabase";

export function TopBuilders() {
  const [rows, setRows] = useState<BoardRow[] | null | "error">(null);
  useEffect(() => {
    if (!ONLINE_ENABLED) return;
    let cancelled = false;
    fetchLeaderboard(null, 5).then(
      (r) => !cancelled && setRows(r),
      () => !cancelled && setRows("error"),
    );
    return () => {
      cancelled = true;
    };
  }, []);
  if (!ONLINE_ENABLED) return null;

  return (
    <div className="card space-y-3 p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold">Today’s top builders</h2>
        <Link href="/leaderboards" className="text-sm font-bold text-grape-dark underline">
          Full leaderboard
        </Link>
      </div>
      {rows === null && <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}
      {rows === "error" && <p className="text-ink-soft">The leaderboard couldn’t load right now.</p>}
      {Array.isArray(rows) && rows.length === 0 && <p className="text-ink-soft">No towers yet today. Yours could be first!</p>}
      {Array.isArray(rows) && rows.length > 0 && (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${r.is_me ? "bg-violet-100" : "bg-slate-50"}`}>
              <span className="w-8 text-center font-display text-lg">{r.rank <= 3 ? MEDALS[r.rank - 1] : `#${r.rank}`}</span>
              <span className="min-w-0 flex-1 truncate font-bold">
                {r.display_name}
                {r.is_me && <span className="chip ml-2 bg-grape text-white">You</span>}
              </span>
              <span className="text-xs font-semibold text-ink-soft">{r.correct}/10</span>
              <span className="font-display text-lg font-bold tabular-nums">{r.score.toLocaleString("en-US")}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
