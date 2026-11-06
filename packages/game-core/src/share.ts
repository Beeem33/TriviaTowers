import type { MatchSummary } from "@triviatowers/shared-types";

export const SITE_URL = "https://triviatowers.io";

/**
 * Spoiler-free share text. Never includes questions or answers — only outcomes.
 */
export function buildShareText(
  summary: MatchSummary,
  opts: { dailyStreak?: number; siteUrl?: string; challengeUrl?: string } = {},
): string {
  const site = opts.siteUrl ?? SITE_URL;
  const grid = summary.outcomes.map((ok) => (ok ? "🟩" : "🟥")).join("");
  const title =
    summary.mode === "daily" && summary.dailyNumber
      ? `TriviaTowers.io · Daily Tower #${summary.dailyNumber}`
      : "TriviaTowers.io · Quick Build";
  const lines = [
    title,
    `🏰 Tower Height: ${summary.floors} ${summary.floors === 1 ? "floor" : "floors"}`,
    `✅ Correct: ${summary.correct}/${summary.total}`,
    `⭐ Score: ${summary.score.toLocaleString("en-US")}`,
    grid,
  ];
  if (summary.rank) lines.push(`🏆 Daily Rank: #${summary.rank.toLocaleString("en-US")}`);
  if (opts.dailyStreak && opts.dailyStreak > 1) lines.push(`🔥 Streak: ${opts.dailyStreak} days`);
  lines.push("Can you build higher?", opts.challengeUrl ?? site);
  return lines.join("\n");
}
