"use client";
import { useSearchParams } from "next/navigation";
import { PlayClient } from "./PlayClient";

export function PlayFromParams() {
  const sp = useSearchParams();
  const raw = sp.get("mode");
  const mode = raw === "quick" || raw === "endless" ? raw : "daily";
  const replay = sp.get("replay") === "1";
  return <PlayClient key={`${mode}-${replay}`} mode={mode} replay={replay} challenge={sp.get("ch") ?? undefined} />;
}
