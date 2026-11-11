"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { QuestionCategory } from "@triviatowers/shared-types";
import { addDays, utcDateKey } from "@triviatowers/game-core";
import { currentClient, ONLINE_ENABLED, withTimeout } from "@/lib/supabase";
import { CATEGORY_META, LETTERS } from "@/components/game/meta";
import { IconCheck, IconX } from "@/components/ui/Icons";

interface ReviewQuestion {
  position: number;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  source: string;
  category: QuestionCategory;
  difficulty: string;
  yourChoice: number | null;
  answered: boolean;
  yourCorrect: boolean | null;
  percentCorrect: number | null;
}
interface Review {
  dateKey: string;
  dailyNumber: number;
  questions: ReviewQuestion[];
}
type State = { key: string; review: Review | null } | { key: string; error: "finish_first" | "failed" } | null;

function formatDate(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

export function ReviewView() {
  const params = useSearchParams();
  const today = utcDateKey();
  const asked = params.get("date");
  const [picked, setPicked] = useState<string | null>(null);
  const date = picked ?? (asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today ? asked : today);
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    if (!ONLINE_ENABLED) return;
    let cancelled = false;
    (async () => {
      const sb = await currentClient();
      if (!sb) throw new Error("offline");
      const { data, error } = await withTimeout(sb.rpc("daily_review", { p_date: date }));
      if (error) throw new Error(error.message);
      return data as Review | null;
    })().then(
      (review) => !cancelled && setState({ key: date, review }),
      (e: Error) => !cancelled && setState({ key: date, error: e.message.includes("finish_first") ? "finish_first" : "failed" }),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (!ONLINE_ENABLED) return <p className="card p-6 text-center">Answer reviews need an internet connection and aren’t available in this offline preview.</p>;

  const current = state?.key === date ? state : null;
  const isToday = date === today;
  const review = current && "review" in current ? current.review : null;
  const score = review?.questions.filter((q) => q.yourCorrect).length;
  const played = review?.questions.some((q) => q.answered);

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Answers</p>
          <h1 className="font-display text-3xl font-bold">{review ? `Daily Tower #${review.dailyNumber}` : "Daily Tower answers"}</h1>
          <p className="text-sm font-semibold text-ink-soft">
            {formatDate(date)}
            {isToday && " · today"}
            {played && ` · you got ${score}/10`}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost !px-3 !py-2 !text-base" onClick={() => setPicked(addDays(date, -1))}>
            ← Prev
          </button>
          <button type="button" className="btn btn-ghost !px-3 !py-2 !text-base" disabled={isToday} onClick={() => setPicked(addDays(date, 1))}>
            Next →
          </button>
        </div>
      </section>

      {!current && <div className="card h-64 animate-pulse" aria-label="Loading answers" />}
      {current && "error" in current && current.error === "finish_first" && (
        <div className="card space-y-3 p-6 text-center">
          <p className="font-display text-2xl font-bold">No peeking! 🙈</p>
          <p className="text-ink-soft">Today’s answers unlock once you’ve built today’s tower, and for everyone after the daily reset at 00:00 UTC.</p>
          <Link href="/play?mode=daily" className="btn btn-sun">
            Play Today’s Tower
          </Link>
        </div>
      )}
      {current && "error" in current && current.error === "failed" && (
        <p className="card p-6 text-center text-bad">Couldn’t load the answers. Check your connection and try again.</p>
      )}
      {current && "review" in current && !current.review && <p className="card p-6 text-center">There was no Daily Tower on this day.</p>}

      {review && (
        <ol className="space-y-3">
          {review.questions.map((q) => {
            const meta = CATEGORY_META[q.category];
            return (
              <li key={q.position} className="card space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold">Q{q.position + 1}</span>
                  <span className={`chip ${meta.color}`}>
                    <span aria-hidden>{meta.emoji}</span> {meta.label}
                  </span>
                  {q.percentCorrect !== null && (
                    <span className="chip bg-slate-100 text-ink-soft">{q.percentCorrect}% of players got it</span>
                  )}
                  {q.answered && (
                    <span className={`chip ${q.yourCorrect ? "bg-emerald-100 text-good" : "bg-rose-100 text-bad"}`}>
                      {q.yourCorrect ? "You got it" : q.yourChoice === null ? "You ran out of time" : "You missed it"}
                    </span>
                  )}
                </div>
                <h2 className="font-display text-xl font-semibold leading-snug">{q.prompt}</h2>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {q.choices.map((c, i) => {
                    const right = i === q.correctIndex;
                    const mine = q.yourChoice === i;
                    return (
                      <li
                        key={i}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold ${
                          right ? "border-good bg-emerald-50" : mine ? "border-bad bg-rose-50" : "border-slate-100"
                        }`}
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white text-xs" aria-hidden>
                          {right ? <IconCheck className="h-4 w-4 text-good" /> : mine ? <IconX className="h-4 w-4 text-bad" /> : LETTERS[i]}
                        </span>
                        <span>
                          {c}
                          {right && <span className="sr-only"> (correct answer)</span>}
                          {mine && !right && <span className="sr-only"> (your answer)</span>}
                          {mine && <span className="ml-1 text-xs font-semibold text-ink-soft">· your pick</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-sm leading-relaxed text-ink-soft">
                  <span className="font-bold text-ink">Did you know? </span>
                  {q.explanation}{" "}
                  <a href={q.source} target="_blank" rel="noopener noreferrer" className="font-bold text-grape-dark underline">
                    Source
                  </a>
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
