"use client";
import { useState } from "react";
import type { MatchSummary } from "@triviatowers/shared-types";
import { buildShareText } from "@triviatowers/game-core";
import { useSettings } from "@/game/settings-store";
import { encodeChallenge } from "@/lib/challenge";
import { siteUrl } from "@/lib/site";
import { captureScene } from "@/components/three/capture";
import { IconCopy, IconDownload, IconLink, IconShare } from "@/components/ui/Icons";
import { renderShareCard } from "./shareCard";

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ShareActions({ summary, streak }: { summary: MatchSummary; streak: number }) {
  const name = useSettings((s) => s.displayName);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const site = siteUrl();
  const challengeUrl = `${site}/play?mode=${summary.mode === "daily" ? "daily" : "quick"}&ch=${encodeChallenge({
    name,
    score: summary.score,
    floors: summary.floors,
    correct: summary.correct,
    total: summary.total,
    daily: summary.dailyNumber,
  })}`;
  const text = buildShareText(summary, { dailyStreak: streak, siteUrl: site, challengeUrl: site });

  const makeImage = async () => {
    const blob = await renderShareCard({ summary, name, streak, towerImage: captureScene(), site });
    if (!blob) throw new Error("Could not create image");
    const fileName = summary.dailyNumber ? `triviatowers-daily-${summary.dailyNumber}.png` : "triviatowers-quick-build.png";
    return new File([blob], fileName, { type: "image/png" });
  };

  const onShare = async () => {
    setBusy(true);
    try {
      if (navigator.share) {
        let files: File[] | undefined;
        try {
          const file = await makeImage();
          if (navigator.canShare?.({ files: [file] })) files = [file];
        } catch {
          /* share text only */
        }
        await navigator.share({ text: `${text}`, url: challengeUrl, ...(files ? { files } : {}) });
      } else {
        flash((await copy(`${text}`)) ? "Result copied — paste it anywhere!" : "Couldn't access the clipboard");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") flash("Sharing isn't available here — try Copy result");
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    setBusy(true);
    try {
      const file = await makeImage();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      flash("Tower card saved!");
    } catch {
      flash("Couldn't create the image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button type="button" className="btn btn-sun w-full" onClick={onShare} disabled={busy}>
        <IconShare className="h-5 w-5" /> Share my tower
      </button>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="btn btn-ghost !px-2 !text-sm" onClick={async () => flash((await copy(text)) ? "Result copied!" : "Couldn't copy")}>
          <IconCopy className="h-4 w-4" /> Copy result
        </button>
        <button type="button" className="btn btn-ghost !px-2 !text-sm" onClick={async () => flash((await copy(challengeUrl)) ? "Challenge link copied!" : "Couldn't copy")}>
          <IconLink className="h-4 w-4" /> Challenge
        </button>
        <button type="button" className="btn btn-ghost !px-2 !text-sm" onClick={onDownload} disabled={busy}>
          <IconDownload className="h-4 w-4" /> Image
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-bold text-grape-dark">
        {toast}
      </p>
    </div>
  );
}
