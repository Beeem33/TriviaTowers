"use client";
import { useId, useState } from "react";
import { exportProgressCode, importProgressCode } from "@/lib/transfer";
import { playSound } from "@/audio/sfx";

/** Copy a progress code here, paste it on another site or device. No account needed. */
export function ProgressTransfer({ compact = false }: { compact?: boolean }) {
  const [code, setCode] = useState("");
  const [exported, setExported] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  const onCopy = async () => {
    setBusy(true);
    try {
      const c = await exportProgressCode();
      setExported(c);
      try {
        await navigator.clipboard.writeText(c);
        setMessage({ ok: true, text: "Progress code copied. Paste it on your other device or site." });
      } catch {
        setMessage({ ok: true, text: "Select the code below and copy it." });
      }
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    setBusy(true);
    try {
      const r = await importProgressCode(code);
      if (r.ok) {
        setCode("");
        playSound("levelup");
        setMessage({
          ok: true,
          text: `Progress imported! XP ${r.xpBefore.toLocaleString("en-US")} → ${r.xpAfter.toLocaleString("en-US")}${r.achievementsAdded ? `, ${r.achievementsAdded} achievement${r.achievementsAdded === 1 ? "" : "s"} added` : ""}.`,
        });
      } else {
        setMessage({ ok: false, text: r.error });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {!compact && (
        <p className="text-sm text-ink-soft">
          Progress is saved in this browser. To move it to another device, browser or site, copy your code here and import it there. Importing
          adds to what’s already there and never lowers your progress.
        </p>
      )}
      <button type="button" className="btn btn-ghost w-full !text-base" onClick={onCopy} disabled={busy}>
        Copy my progress code
      </button>
      {exported && (
        <textarea
          id={`${id}-export`}
          readOnly
          value={exported}
          onFocus={(e) => e.currentTarget.select()}
          className="h-20 w-full rounded-2xl border-2 border-slate-200 p-2 font-mono text-[11px] break-all"
          aria-label="Your progress code"
        />
      )}
      <label className="block space-y-1.5">
        <span className="font-display text-sm font-semibold text-ink-soft">Import a progress code</span>
        <textarea
          id={`${id}-import`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste a code starting with TT1."
          className="h-20 w-full rounded-2xl border-2 border-slate-200 p-2 font-mono text-[11px] focus:border-grape focus:outline-none"
        />
      </label>
      <button type="button" className="btn btn-grape w-full !text-base" onClick={onImport} disabled={busy || code.trim().length === 0}>
        Import progress
      </button>
      {message && (
        <p role="status" className={`rounded-2xl px-3 py-2 text-sm font-semibold ${message.ok ? "bg-emerald-50 text-good" : "bg-rose-50 text-bad"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
