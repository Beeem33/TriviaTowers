import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_RULES, ENDLESS_LIVES, ENDLESS_MIN_TIME_MS, XP_RULES, maxPossibleScore } from "@triviatowers/game-core";
import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = {
  title: "How to Play",
  description: "Rules, scoring, game modes, streaks, XP and achievements in TriviaTowers.",
};

const r = DEFAULT_RULES;

export default function HowToPlayPage() {
  return (
    <InfoPage title="How to Play" intro="Answer trivia questions to build a tower. Every correct answer adds a floor. Fast answers and streaks score extra.">
      <h2>The basics</h2>
      <ol>
        <li>A question appears with four answers. You have {r.questionTimeMs / 1000} seconds.</li>
        <li>Pick an answer by tapping it, or press 1–4 (or A–D) on a keyboard.</li>
        <li>Right answer: a new floor swoops onto your tower. Wrong answer or time up: your tower wobbles and your streak resets.</li>
        <li>After each answer you see the correct one and a short “Did you know?” fact.</li>
      </ol>

      <h2>Scoring</h2>
      <table>
        <thead>
          <tr><th>For each correct answer</th><th>Points</th></tr>
        </thead>
        <tbody>
          <tr><td>Base</td><td>{r.basePoints}</td></tr>
          <tr><td>Speed bonus (full if you answer within {r.speedGraceMs / 1000} second, falling to 0 at the buzzer)</td><td>up to {r.maxSpeedBonus}</td></tr>
          <tr><td>Streak bonus (+{r.streakStep} for each correct answer in a row before this one)</td><td>up to {r.maxStreakBonus}</td></tr>
        </tbody>
      </table>
      <p>
        Wrong answers and timeouts score 0. A perfect 10-question round scores {maxPossibleScore(10).toLocaleString("en-US")} points. Ties on the
        leaderboard are broken by number of correct answers, then by total answer time.
      </p>

      <h2>Game modes</h2>
      <h3>Daily Tower</h3>
      <p>
        One set of {r.dailyQuestionCount} questions for everyone, every day. It resets at 00:00 UTC. You get one official attempt per day; replays
        are for practice only. Play on consecutive days to build your daily streak.
      </p>
      <h3>Quick Build</h3>
      <p>A random set of {r.quickQuestionCount} questions. Play as often as you like.</p>
      <h3>Endless Tower</h3>
      <p>
        Keep answering until you lose all {ENDLESS_LIVES} lives. Each wrong answer or timeout costs a life. The higher you build, the harder the
        questions get and the shorter the timer, down to {ENDLESS_MIN_TIME_MS / 1000} seconds.
      </p>
      <h3>Friend Battles (coming soon)</h3>
      <p>Live rooms for 2–8 players racing through the same questions.</p>

      <h2>XP, levels and unlocks</h2>
      <ul>
        <li>{XP_RULES.perCorrect} XP per correct answer and {XP_RULES.perAnswered} XP per question answered.</li>
        <li>+{XP_RULES.dailyCompletion} XP for finishing your Daily Tower, +{XP_RULES.perfectRound} XP for a perfect 10/10 round.</li>
        <li>Levels unlock new tower skins and island themes. Equip them on your <Link href="/profile">Profile</Link>.</li>
        <li>Achievements reward milestones like a 7-day streak or a 20-floor Endless tower.</li>
      </ul>
      <p>Everything you unlock is cosmetic. Nothing you earn or buy will ever make questions easier or give extra points.</p>

      <h2>Sharing</h2>
      <p>
        On the results screen, share your result (it never reveals the answers), send a friend a challenge link, or save an image of your finished
        tower.
      </p>

      <h2>Tips</h2>
      <ul>
        <li>Speed matters, but a wrong answer costs your streak. When unsure, take a second.</li>
        <li>Drag the 3D view to look around your tower.</li>
        <li>Sound, music, motion and graphics options are in Settings (the gear icon).</li>
      </ul>
    </InfoPage>
  );
}
