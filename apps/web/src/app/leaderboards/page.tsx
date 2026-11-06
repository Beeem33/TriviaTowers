import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Leaderboards" };

export default function LeaderboardsPage() {
  return (
    <ComingSoon
      emoji="🏆"
      title="Leaderboards"
      phase="Phase 2–5"
      intro="Ranked leaderboards need server-verified scores, so they launch together with online daily challenges and accounts. Your local best towers are on the homepage until then."
      items={["Daily global ranking", "Weekly seasons", "Friends leaderboard", "Lifetime records"]}
    />
  );
}
