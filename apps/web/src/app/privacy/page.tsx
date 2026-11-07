import type { Metadata } from "next";
import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = { title: "Privacy Policy", description: "How TriviaTowers.io handles your data." };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" updated="November 7, 2026">
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm">
        <b>Pre-launch draft.</b> This policy describes the game as it works today. It will be updated, and reviewed by a legal professional, before
        accounts, analytics or advertising are added.
      </p>

      <h2>The short version</h2>
      <p>
        You can play without giving us your name, email or any other personal details. When you play the online Daily Tower, the game creates an
        anonymous guest ID for your browser so the server can check your answers and put your score on the leaderboard. There are no ads, no
        analytics and no tracking cookies.
      </p>

      <h2>What the server stores (online Daily Tower)</h2>
      <ul>
        <li>An anonymous guest ID and a session token kept in your browser. It is not linked to your email or real name.</li>
        <li>Your builder name, which appears on the public daily leaderboard. Choose any name you like in Settings; don’t use your real full name if you’d rather not.</li>
        <li>For each Daily Tower you play: the answers you chose, how long each took, your score, and when you played.</li>
        <li>Standard security logs kept by our database provider, Supabase (such as IP address and request times), used to keep the service running and prevent abuse.</li>
      </ul>
      <p>
        This data is used only to run the game: scoring, enforcing one attempt per day, and showing leaderboards. It is stored with Supabase in the
        United States. We don’t sell it or share it with advertisers.
      </p>

      <h2>What is stored on your device</h2>
      <p>The game uses your browser’s local storage to remember:</p>
      <ul>
        <li>Your game history, daily results, streak, XP, achievements and records.</li>
        <li>Your settings: builder name, sound and music volume, motion and graphics preferences, and equipped skin and island.</li>
        <li>A random identifier used to vary your tower’s design. It is not linked to who you are.</li>
      </ul>
      <p>
        This data stays in your browser. To delete it, clear this site’s data in your browser settings. Clearing it also removes your guest ID, so
        the server can no longer connect past results to you.
      </p>

      <h2>What we receive</h2>
      <p>
        Like any website, the server that delivers the game’s files may record standard technical logs (such as IP address, browser type and the
        pages requested) for security and reliability. We do not use these logs to identify or profile players.
      </p>

      <h2>Sharing</h2>
      <p>
        When you choose to share a result or challenge link, the text or image is created on your device and shared only through the app you pick.
        Share text never includes the questions or answers.
      </p>

      <h2>Planned changes</h2>
      <p>Before any of the following launch, this policy will be updated to explain exactly what is collected and why:</p>
      <ul>
        <li><b>Accounts</b> (optional, never required to play): to save progress across devices.</li>
        <li><b>Friends and multiplayer</b>: friend lists and match results.</li>
        <li><b>Advertising</b> (Google AdSense), with a consent choice where the law requires one.</li>
        <li><b>Purchases</b> of cosmetic items, processed by Stripe. We will never see your full card details.</li>
        <li><b>Privacy-friendly analytics</b> to understand how the game is used.</li>
      </ul>

      <h2>Children</h2>
      <p>TriviaTowers is intended for players aged 13 and over and is not directed at children under 13.</p>

      <h2>Contact</h2>
      <p>Contact details for privacy questions will be published here before launch.</p>
    </InfoPage>
  );
}
