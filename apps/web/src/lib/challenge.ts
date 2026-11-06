/**
 * Challenge links (asynchronous competition, Phase 1 version).
 *
 * The link carries a SELF-REPORTED score so a friend can see what to beat. It is not
 * trusted for anything — it never touches a leaderboard. Phase 2 replaces the payload
 * with an opaque attempt ID that the server resolves to a verified result.
 */
import { cleanDisplayName } from "@/game/settings-store";

export interface ChallengeClaim {
  name: string;
  score: number;
  floors: number;
  correct: number;
  total: number;
  daily?: number;
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeChallenge(c: ChallengeClaim): string {
  return toBase64Url(JSON.stringify([c.name, c.score, c.floors, c.correct, c.total, c.daily ?? 0]));
}

const int = (v: unknown, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : null);

export function decodeChallenge(raw: string | null | undefined): ChallengeClaim | null {
  if (!raw || raw.length > 200) return null;
  try {
    const arr = JSON.parse(fromBase64Url(raw));
    if (!Array.isArray(arr)) return null;
    const name = typeof arr[0] === "string" ? cleanDisplayName(arr[0]) : "";
    const score = int(arr[1], 100_000);
    const floors = int(arr[2], 1000);
    const correct = int(arr[3], 1000);
    const total = int(arr[4], 1000);
    const daily = int(arr[5], 1_000_000);
    if (!name || score === null || floors === null || correct === null || total === null || correct > total) return null;
    return { name, score, floors, correct, total, daily: daily || undefined };
  } catch {
    return null;
  }
}
