/**
 * Single-file preview of TriviaTowers (no Next.js server). Pages are switched by plain
 * #hash names: #home, #daily, #quick, #endless, #friends, #leaderboards, #profile,
 * #how-to-play, #about, #privacy, #terms.
 */
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import HomePage from "@/app/page";
import FriendsPage from "@/app/friends/page";
import LeaderboardsPage from "@/app/leaderboards/page";
import ProfilePage from "@/app/profile/page";
import HowToPlayPage from "@/app/how-to-play/page";
import AboutPage from "@/app/about/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import ReviewPage from "@/app/review/page";
import { PlayClient } from "@/components/game/PlayClient";
import { ClientEffects } from "@/components/ui/ClientEffects";

const MODES = ["daily", "quick", "endless"] as const;
type Mode = (typeof MODES)[number];

function currentRoute(): string {
  return window.location.hash.replace(/^#/, "") || "home";
}

function App() {
  const [route, setRoute] = useState(currentRoute);
  const [visit, setVisit] = useState(0);
  useEffect(() => {
    const onHash = () => {
      setRoute(currentRoute());
      setVisit((v) => v + 1);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  let page;
  if ((MODES as readonly string[]).includes(route)) {
    page = <PlayClient key={`${route}-${visit}`} mode={route as Mode} replay={false} />;
  } else if (route === "friends") page = <FriendsPage />;
  else if (route === "leaderboards") page = <LeaderboardsPage />;
  else if (route === "profile") page = <ProfilePage />;
  else if (route === "how-to-play") page = <HowToPlayPage />;
  else if (route === "about") page = <AboutPage />;
  else if (route === "privacy") page = <PrivacyPage />;
  else if (route === "terms") page = <TermsPage />;
  else if (route === "review") page = <ReviewPage />;
  else page = <HomePage />;

  return (
    <>
      <ClientEffects />
      {page}
    </>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
