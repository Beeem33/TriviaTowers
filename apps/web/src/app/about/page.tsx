import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = { title: "About", description: "What TriviaTowers.io is and where it's headed." };

export default function AboutPage() {
  return (
    <InfoPage title="About TriviaTowers" intro="A free browser game where trivia knowledge turns into a tower you can be proud of.">
      <p>
        TriviaTowers.io mixes a daily trivia challenge with a little building game. Every correct answer adds a floor to your tower on a floating
        island. Everyone gets the same questions each day, so you can compare towers with friends, keep a streak going, and see who builds
        highest.
      </p>
      <h2>What makes it different</h2>
      <ul>
        <li>One shared Daily Tower for everyone, plus Quick Build and Endless modes whenever you want more.</li>
        <li>Your tower is a real 3D model, built floor by floor, that you can share as an image.</li>
        <li>Questions cover geography, history, science, technology, sports, entertainment, nature, food, pop culture and general knowledge.</li>
        <li>Each question comes with a short fact, so you learn something even when you miss.</li>
        <li>No download and no account needed to play.</li>
      </ul>
      <h2>Fair play</h2>
      <p>
        Rewards are cosmetic: skins, island themes, titles and badges. Nothing can be bought that helps you answer or score. When online leaderboards
        launch, answers and timing will be checked on our servers.
      </p>
      <h2>Where it’s headed</h2>
      <p>
        TriviaTowers is in early preview. Coming next: online daily leaderboards, accounts so progress follows you between devices, friends, and live
        Friend Battles for up to eight players.
      </p>
      <p>
        New here? Read <Link href="/how-to-play">How to Play</Link> or jump straight into <Link href="/play?mode=daily">today’s tower</Link>.
      </p>
    </InfoPage>
  );
}
