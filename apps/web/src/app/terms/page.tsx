import type { Metadata } from "next";
import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = { title: "Terms of Use", description: "The rules for using TriviaTowers.io." };

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Use" updated="November 7, 2026">
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm">
        <b>Pre-launch draft.</b> These terms will be completed and reviewed by a legal professional before TriviaTowers.io launches publicly.
      </p>

      <h2>Using the game</h2>
      <p>
        TriviaTowers.io is a free browser game. By playing, you agree to these terms. You must be at least 13 years old to play. If you are under
        the age of majority where you live, a parent or guardian should review these terms with you.
      </p>

      <h2>Fair play</h2>
      <p>Leaderboards are only fun when they are fair. You agree not to:</p>
      <ul>
        <li>Use bots, scripts or tools that answer questions or interfere with the game.</li>
        <li>Tamper with scores, timers or game requests.</li>
        <li>Use more than one account to gain extra ranked attempts.</li>
        <li>Share answers to the Daily Tower publicly before the daily reset.</li>
      </ul>
      <p>We may remove results, reset progress or block access when we believe these rules have been broken.</p>

      <h2>Names and conduct</h2>
      <p>
        Builder names and usernames must not impersonate others (including TriviaTowers staff) or be offensive, hateful or misleading. We may change
        or remove names that break this rule.
      </p>

      <h2>Trivia content</h2>
      <p>
        We work hard to check every question, but mistakes can happen. Questions, answers and explanations are provided for entertainment and may
        be corrected at any time.
      </p>

      <h2>Cosmetic items</h2>
      <p>
        Skins, island themes, badges and other rewards are cosmetic only. They have no cash value and cannot be exchanged or transferred. If
        purchases are introduced, separate purchase terms and a refund policy will be published first.
      </p>

      <h2>Progress and availability</h2>
      <p>
        During the preview, progress is stored in your browser and can be lost if you clear your browser data. The game is provided “as is”; we may
        change, pause or discontinue features at any time.
      </p>

      <h2>Changes to these terms</h2>
      <p>We may update these terms. The date at the top shows the latest version. Continuing to play after an update means you accept the new terms.</p>
    </InfoPage>
  );
}
