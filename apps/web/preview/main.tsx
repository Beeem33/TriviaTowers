/**
 * Single-file preview of TriviaTowers (no Next.js server). Pages are switched by plain
 * #hash names: #home, #daily, #quick, #endless, #friends, #leaderboards.
 */
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import HomePage from "@/app/page";
import FriendsPage from "@/app/friends/page";
import LeaderboardsPage from "@/app/leaderboards/page";
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
