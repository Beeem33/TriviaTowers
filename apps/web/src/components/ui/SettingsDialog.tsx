"use client";
import { useEffect, useRef, useState } from "react";
import { cleanDisplayName, useSettings, type MotionPref, type QualityPref } from "@/game/settings-store";
import { playSound } from "@/audio/sfx";
import { IconGear, IconX } from "./Icons";

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="font-display text-sm font-semibold text-ink-soft">{label}</legend>
      <div className="grid grid-flow-col gap-1 rounded-2xl bg-slate-100 p-1">
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input type="radio" className="peer sr-only" name={label} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="block rounded-xl px-3 py-2 text-center text-sm font-bold text-ink-soft transition peer-checked:bg-white peer-checked:text-ink peer-checked:shadow peer-focus-visible:outline-3 peer-focus-visible:outline-ink">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SettingsButton({ className = "" }: { className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const s = useSettings();
  const [name, setName] = useState("");

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => {
      const cleaned = cleanDisplayName(name);
      if (cleaned.length >= 2) s.set({ displayName: cleaned });
    };
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, [name, s]);

  return (
    <>
      <button
        type="button"
        className={`btn btn-ghost h-11 w-11 !p-0 ${className}`}
        aria-label="Settings"
        title="Settings"
        onClick={() => {
          setName(useSettings.getState().displayName);
          dialog.current?.showModal();
        }}
      >
        <IconGear className="h-5 w-5" />
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(92vw,26rem)] rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
        aria-labelledby="settings-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between">
            <h2 id="settings-title" className="font-display text-2xl font-bold">Settings</h2>
            <button type="button" className="rounded-full p-2 hover:bg-slate-100" aria-label="Close settings" onClick={() => dialog.current?.close()}>
              <IconX className="h-5 w-5" />
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="font-display text-sm font-semibold text-ink-soft">Builder name</span>
            <input
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 font-bold focus:border-grape focus:outline-none"
              aria-describedby="name-help"
            />
            <span id="name-help" className="block text-xs text-ink-soft">Shown on your share cards. 2–20 letters or numbers.</span>
          </label>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-ink-soft" id="vol-label">Sound volume</span>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={s.muted} onChange={(e) => s.set({ muted: e.target.checked })} className="h-4 w-4 accent-grape" />
                Mute
              </label>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.volume}
              aria-labelledby="vol-label"
              onChange={(e) => s.set({ volume: Number(e.target.value) })}
              onPointerUp={() => playSound("correct")}
              className="w-full accent-grape"
            />
          </div>

          <Segmented<MotionPref>
            label="Motion"
            value={s.motion}
            onChange={(motion) => s.set({ motion })}
            options={[
              { value: "system", label: "System" },
              { value: "reduced", label: "Reduced" },
              { value: "full", label: "Full" },
            ]}
          />
          <Segmented<QualityPref>
            label="Graphics"
            value={s.quality}
            onChange={(quality) => s.set({ quality, autoDowngraded: false })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "high", label: "High" },
              { value: "low", label: "Battery saver" },
            ]}
          />
          {s.quality === "auto" && s.autoDowngraded && (
            <p className="text-xs text-ink-soft">Auto switched to lighter graphics to keep things smooth on this device.</p>
          )}
          <button type="button" className="btn btn-grape w-full" onClick={() => dialog.current?.close()}>Done</button>
        </div>
      </dialog>
    </>
  );
}
