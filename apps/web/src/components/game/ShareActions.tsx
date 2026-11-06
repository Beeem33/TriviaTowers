"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { MatchSummary } from "@triviatowers/shared-types";
import { buildShareText } from "@triviatowers/game-core";
import { useSettings } from "@/game/settings-store";
import { encodeChallenge } from "@/lib/challenge";
import { siteUrl } from "@/lib/site";
import { captureScene } from "@/components/three/capture";
import {
  IconCopy,
  IconDownload,
  IconLink,
  IconShare,
} from "@/components/ui/Icons";
import { renderShareCard } from "./shareCard";

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ShareActions({
  summary,
  streak,
}: {
  summary: MatchSummary;
  streak: number;
}) {
  const name = useSettings((s) => s.displayName);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(
    null,
  );

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const site = siteUrl();
  const challengeUrl = `${site}/play?mode=${summary.mode === "battle" ? "quick" : summary.mode}&ch=${encodeChallenge(
    {
      name,
      score: summary.score,
      floors: summary.floors,
      correct: summary.correct,
      total: summary.total,
      daily: summary.dailyNumber,
    },
  )}`;
  const text = buildShareText(summary, {
    dailyStreak: streak,
    siteUrl: site,
    challengeUrl: site,
  });

  const makeImage = async () => {
    const blob = await renderShareCard({
      summary,
      name,
      streak,
      towerImage: captureScene(),
      site,
    });
    if (!blob) throw new Error("Could not create image");
    const fileName = summary.dailyNumber
      ? `triviatowers-daily-${summary.dailyNumber}.png`
      : `triviatowers-${summary.mode}.png`;
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
        await navigator.share({
          text: `${text}`,
          url: challengeUrl,
          ...(files ? { files } : {}),
        });
      } else {
        flash(
          (await copy(`${text}`))
            ? "Result copied — paste it anywhere!"
            : "Couldn't access the clipboard",
        );
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError")
        flash("Sharing isn't available here — try Copy result");
    } finally {
      setBusy(false);
    }
  };

  // Show the card on screen; from there it can be saved (download link, or long-press /
  // right-click "Save image" where downloads are blocked, e.g. embedded previews).
  const onDownload = async () => {
    setBusy(true);
    try {
      const file = await makeImage();
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({ url: URL.createObjectURL(file), name: file.name });
    } catch {
      flash("Couldn't create the image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn btn-sun w-full"
        onClick={onShare}
        disabled={busy}
      >
        <IconShare className="h-5 w-5" /> Share my tower
      </button>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className="btn btn-ghost !px-2 !text-sm"
          onClick={async () =>
            flash((await copy(text)) ? "Result copied!" : "Couldn't copy")
          }
        >
          <IconCopy className="h-4 w-4" /> Copy result
        </button>
        <button
          type="button"
          className="btn btn-ghost !px-2 !text-sm"
          onClick={async () =>
            flash(
              (await copy(challengeUrl))
                ? "Challenge link copied!"
                : "Couldn't copy",
            )
          }
        >
          <IconLink className="h-4 w-4" /> Challenge
        </button>
        <button
          type="button"
          className="btn btn-ghost !px-2 !text-sm"
          onClick={onDownload}
          disabled={busy}
        >
          <IconDownload className="h-4 w-4" /> Image
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-center text-sm font-bold text-grape-dark"
      >
        {toast}
      </p>
      {preview &&
        // Portal: the results card uses backdrop-filter, which would trap a fixed overlay inside it.
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your tower card"
            className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPreview(null);
            }}
          >
            <div className="card tt-pop w-full max-w-sm space-y-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt="Your tower card with score and floors"
                className="w-full rounded-2xl"
              />
              <p className="text-center text-xs text-ink-soft">
                Right-click or long-press the image to save or copy it.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={preview.url}
                  download={preview.name}
                  className="btn btn-sun !text-base"
                >
                  Download
                </a>
                <button
                  type="button"
                  className="btn btn-ghost !text-base"
                  autoFocus
                  onClick={() => setPreview(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
