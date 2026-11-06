"use client";
import { useSearchParams } from "next/navigation";
import { PlayClient } from "./PlayClient";

export function PlayFromParams() {
  const sp = useSearchParams();
  const mode = sp.get("mode") === "quick" ? "quick" : "daily";
  const replay = sp.get("replay") === "1";
  return <PlayClient key={`${mode}-${replay}`} mode={mode} replay={replay} challenge={sp.get("ch") ?? undefined} />;
}
