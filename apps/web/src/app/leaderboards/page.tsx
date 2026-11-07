import type { Metadata } from "next";
import { Header, Footer } from "@/components/ui/Header";
import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";

export const metadata: Metadata = { title: "Leaderboards" };

export default function LeaderboardsPage() {
  return (
    <div className="sky-bg min-h-dvh">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
        <LeaderboardView />
      </main>
      <Footer />
    </div>
  );
}
