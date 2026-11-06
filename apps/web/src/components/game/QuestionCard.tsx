"use client";
import { useEffect, useState } from "react";
import type { ChoiceIndex } from "@triviatowers/shared-types";
import { useGame } from "@/game/game-store";
import { useSettings } from "@/game/settings-store";
import { IconCheck, IconX } from "@/components/ui/Icons";
import { TimerBar } from "./TimerBar";
import { CATEGORY_META, DIFFICULTY_LABEL, LETTERS } from "./meta";

export const REVEAL_MS = { correct: 2600, wrong: 4200 };

function AnswerButton({ index, text, onPick }: { index: ChoiceIndex; text: string; onPick: (i: ChoiceIndex) => void }) {
  const status = useGame((s) => s.status);
  const selected = useGame((s) => s.selected);
  const verdict = useGame((s) => s.verdict);
  const revealing = status === "reveal" && verdict;
  const isCorrect = revealing && verdict.correctIndex === index;
  const isWrongPick = revealing && selected === index && !verdict.correct;
  const isPending = status === "submitting" && selected === index;
  const disabled = status !== "question";

  let tone = "bg-white text-ink border-slate-200 hover:border-grape hover:bg-violet-50";
  let badge = "bg-slate-100 text-ink";
  if (isPending) tone = "bg-violet-100 text-ink border-grape animate-pulse";
  if (revealing) {
    tone = "bg-white/70 text-ink/50 border-slate-200";
    if (isCorrect) {
      tone = "bg-good text-white border-good tt-pop";
      badge = "bg-white text-good";
    } else if (isWrongPick) {
      tone = "bg-bad text-white border-bad tt-shake";
      badge = "bg-white text-bad";
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(index)}
      className={`group relative flex min-h-14 w-full items-center gap-3 rounded-2xl border-[3px] px-3 py-2.5 text-left font-bold shadow-[0_4px_0_rgba(29,39,71,0.12)] transition-colors focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default ${tone}`}
      aria-keyshortcuts={`${index + 1} ${LETTERS[index]}`}
      aria-label={`${LETTERS[index]}: ${text}${isCorrect ? " — correct answer" : ""}${isWrongPick ? " — your answer, incorrect" : ""}`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-lg ${badge}`} aria-hidden>
        {isCorrect ? <IconCheck className="h-5 w-5" /> : isWrongPick ? <IconX className="h-5 w-5" /> : LETTERS[index]}
      </span>
      <span className="text-base leading-snug sm:text-[1.05rem]">{text}</span>
    </button>
  );
}

function NextButton({ ms, onNext, last }: { ms: number; onNext: () => void; last: boolean }) {
  const autoAdvance = useSettings((s) => s.autoAdvance);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <button type="button" onClick={onNext} className="btn btn-grape relative w-full overflow-hidden" autoFocus>
      {autoAdvance && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-white/20"
          style={{ width: armed ? "100%" : "0%", transition: `width ${ms}ms linear` }}
        />
      )}
      <span className="relative">{last ? "See my tower" : "Next question"} →</span>
    </button>
  );
}

export function QuestionCard({ onPick, onNext }: { onPick: (i: ChoiceIndex) => void; onNext: () => void }) {
  const status = useGame((s) => s.status);
  const question = useGame((s) => s.questions[s.index]);
  const index = useGame((s) => s.index);
  const total = useGame((s) => s.questions.length);
  const deadline = useGame((s) => s.deadline);
  const verdict = useGame((s) => s.verdict);
  const rules = useGame((s) => s.session?.rules);

  if (!question || !rules) return null;
  const meta = CATEGORY_META[question.category];
  const shortAnswers = question.choices.every((c) => c.length <= 16);
  const revealing = status === "reveal" && verdict;

  return (
    <section key={question.id} className="card tt-rise space-y-3 p-4 sm:p-5" aria-labelledby="question-prompt">
      <div className="flex items-center justify-between gap-2">
        <span className={`chip ${meta.color}`}>
          <span aria-hidden>{meta.emoji}</span> {meta.label}
        </span>
        <span className="chip bg-slate-100 text-ink-soft">{DIFFICULTY_LABEL[question.difficulty]}</span>
      </div>

      <h2 id="question-prompt" className="font-display text-xl font-semibold leading-snug text-balance sm:text-2xl">
        <span className="sr-only">Question {index + 1} of {total}: </span>
        {question.prompt}
      </h2>

      {!revealing ? (
        <TimerBar deadline={deadline} durationMs={rules.questionTimeMs} running={status === "question"} />
      ) : (
        <div
          className={`tt-pop flex items-start gap-3 rounded-2xl px-3 py-2.5 ${verdict.correct ? "bg-emerald-50 text-good" : "bg-rose-50 text-bad"}`}
        >
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white ${verdict.correct ? "bg-good" : "bg-bad"}`} aria-hidden>
            {verdict.correct ? <IconCheck className="h-5 w-5" /> : <IconX className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight">
              {verdict.correct
                ? `Correct! +${verdict.points}`
                : verdict.choiceIndex === null
                  ? "Time's up!"
                  : "Not quite!"}
            </p>
            <p className="text-sm font-semibold text-ink-soft">
              {verdict.correct
                ? `Base ${verdict.basePoints} · Speed +${verdict.speedBonus} · Streak +${verdict.streakBonus}`
                : `Answer: ${question.choices[verdict.correctIndex]}. Your streak resets — keep building!`}
            </p>
          </div>
        </div>
      )}

      <div className={`grid gap-2 ${shortAnswers ? "grid-cols-2" : "grid-cols-1"}`} role="group" aria-label="Answers">
        {question.choices.map((text, i) => (
          <AnswerButton key={i} index={i as ChoiceIndex} text={text} onPick={onPick} />
        ))}
      </div>

      {revealing && (
        <div className="tt-rise space-y-3">
          <p className="rounded-2xl bg-sky-50 px-3 py-2 text-sm leading-relaxed text-ink-soft">
            <span className="font-bold text-ink">Did you know? </span>
            {verdict.explanation}
          </p>
          <NextButton
            key={question.id}
            ms={verdict.correct ? REVEAL_MS.correct : REVEAL_MS.wrong}
            onNext={onNext}
            last={index + 1 >= total}
          />
        </div>
      )}
      {status === "question" && (
        <p className="hidden text-center text-xs text-ink-soft sm:block">Tip: press 1–4 or A–D to answer</p>
      )}
    </section>
  );
}
