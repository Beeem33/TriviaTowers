/**
 * Move progress between sites/devices without an account: export a code, paste it elsewhere.
 * The code holds local progress (XP, achievements, history, records, streak days) and
 * cosmetic settings. It contains no sign-in tokens.
 *
 * Importing MERGES into the current progress (never lowers anything), so importing the same
 * code twice, or importing into a device that already has progress, is safe.
 */
import type { MatchSummary } from "@triviatowers/shared-types";
import { useSettings } from "@/game/settings-store";
import { cleanDisplayName } from "@/game/settings-store";
import { loadProgress, saveProgress, type LocalProgress } from "./progress";

const PREFIX = "TT1.";

interface Payload {
  v: 1;
  progress: LocalProgress;
  settings: { displayName: string; skinId: string; islandId: string };
}

function toB64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function gzip(data: Uint8Array, mode: "compress" | "decompress"): Promise<Uint8Array> {
  const Stream = mode === "compress" ? CompressionStream : DecompressionStream;
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new Stream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function exportProgressCode(): Promise<string> {
  const s = useSettings.getState();
  const payload: Payload = {
    v: 1,
    progress: loadProgress(),
    settings: { displayName: s.displayName, skinId: s.skinId, islandId: s.islandId },
  };
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  const packed = typeof CompressionStream === "function" ? await gzip(raw, "compress") : raw;
  return `${PREFIX}${typeof CompressionStream === "function" ? "z" : "j"}${toB64Url(packed)}`;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const num = (x: unknown, max = 1e9) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.min(x, max) : 0);

function validSummary(x: unknown): x is MatchSummary {
  return isObj(x) && typeof x.mode === "string" && typeof x.score === "number" && typeof x.finishedAt === "string" && Array.isArray(x.outcomes);
}

export type ImportResult = { ok: true; xpBefore: number; xpAfter: number; achievementsAdded: number } | { ok: false; error: string };

export async function importProgressCode(code: string): Promise<ImportResult> {
  const trimmed = code.trim().replace(/\s+/g, "");
  if (!trimmed.startsWith(PREFIX) || trimmed.length < 10 || trimmed.length > 200_000) {
    return { ok: false, error: "That doesn’t look like a TriviaTowers progress code. It should start with “TT1.”" };
  }
  let payload: Payload;
  try {
    const kind = trimmed[PREFIX.length];
    const bytes = fromB64Url(trimmed.slice(PREFIX.length + 1));
    const raw = kind === "z" ? await gzip(bytes, "decompress") : bytes;
    payload = JSON.parse(new TextDecoder().decode(raw)) as Payload;
    if (payload?.v !== 1 || !isObj(payload.progress)) throw new Error("bad");
  } catch {
    return { ok: false, error: "This code is incomplete or damaged. Copy the whole code again and paste it here." };
  }

  const cur = loadProgress();
  const inc = payload.progress;
  const xpBefore = cur.xp;

  // Daily results: keep the first one recorded for each day.
  if (isObj(inc.daily)) {
    for (const [day, r] of Object.entries(inc.daily)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && validSummary(r) && !cur.daily[day]) cur.daily[day] = r;
    }
  }
  // History: union by finish time, newest first.
  if (Array.isArray(inc.history)) {
    const seen = new Set(cur.history.map((h) => h.finishedAt));
    for (const h of inc.history) if (validSummary(h) && !seen.has(h.finishedAt)) cur.history.push(h);
    cur.history = cur.history.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, 30);
  }
  // Totals and XP: take the larger value (merging never lowers progress or double-counts).
  if (isObj(inc.lifetime)) {
    const l = inc.lifetime as Record<string, unknown>;
    cur.lifetime = {
      games: Math.max(cur.lifetime.games, num(l.games)),
      answered: Math.max(cur.lifetime.answered, num(l.answered)),
      correct: Math.max(cur.lifetime.correct, num(l.correct)),
      score: Math.max(cur.lifetime.score, num(l.score)),
      highestTower: Math.max(cur.lifetime.highestTower, num(l.highestTower, 10_000)),
    };
  }
  cur.xp = Math.max(cur.xp, num(inc.xp));
  if (isObj(inc.endlessBest) && typeof inc.endlessBest.floors === "number") {
    const b = inc.endlessBest as { floors: number; score: number; finishedAt: string };
    if (!cur.endlessBest || b.floors > cur.endlessBest.floors || (b.floors === cur.endlessBest.floors && b.score > cur.endlessBest.score)) {
      cur.endlessBest = { floors: num(b.floors, 10_000), score: num(b.score), finishedAt: String(b.finishedAt) };
    }
  }
  let achievementsAdded = 0;
  if (isObj(inc.achievements)) {
    for (const [id, when] of Object.entries(inc.achievements)) {
      if (typeof when === "string" && /^[a-z0-9-]{2,40}$/.test(id) && !cur.achievements[id]) {
        cur.achievements[id] = when;
        achievementsAdded++;
      }
    }
  }
  saveProgress(cur);

  if (isObj(payload.settings)) {
    const st = payload.settings;
    const name = cleanDisplayName(String(st.displayName ?? ""));
    useSettings.getState().set({
      ...(name.length >= 2 ? { displayName: name } : {}),
      ...(typeof st.skinId === "string" ? { skinId: st.skinId } : {}),
      ...(typeof st.islandId === "string" ? { islandId: st.islandId } : {}),
    });
  }
  return { ok: true, xpBefore, xpAfter: cur.xp, achievementsAdded };
}
