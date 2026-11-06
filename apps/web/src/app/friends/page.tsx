import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Play With Friends" };

export default function FriendsPage() {
  return (
    <ComingSoon
      emoji="🏰"
      title="Friend Battles"
      phase="Phase 4"
      intro="Real-time rooms for 2–8 players are on the way: share a room code, race through the same questions, and watch everyone’s towers grow live."
      items={["Private rooms with short codes", "Live tower growth", "Synchronized timers", "Rematches"]}
    >
      <div className="rounded-2xl bg-violet-50 p-4">
        <p className="font-display text-lg font-bold">Challenge a friend today</p>
        <p className="text-ink-soft">
          Play today’s tower, then tap <b>Challenge</b> on the results screen to send a link. Your friend plays the same 10 questions whenever they like and sees the score to beat.
        </p>
      </div>
    </ComingSoon>
  );
}
