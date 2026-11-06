"use client";
import { generateTower, TOWER_SKINS } from "@triviatowers/game-core";

/** Lightweight 2D tower used when WebGL is unavailable. Same blueprint, same colours. */
export function TowerFallback({ floors, wobbleTick, label }: { floors: number; wobbleTick: number; label: string }) {
  const skin = TOWER_SKINS.classic!;
  const shown = Math.min(floors, 14);
  const specs = generateTower(1, floors).floors.slice(-shown);
  const color = { stone: skin.stone, brick: skin.brick, timber: skin.timber, castle: skin.castle } as const;
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-6" role="img" aria-label={label}>
      <div key={wobbleTick} className="flex flex-col items-center tt-wobble-2d">
        <div className="h-0 w-0 border-x-[44px] border-b-[52px] border-x-transparent" style={{ borderBottomColor: skin.roof }} />
        {floors > shown && <div className="text-xs font-bold text-ink/60">+{floors - shown} more</div>}
        {specs.reverse().map((f) => (
          <div
            key={f.index}
            className="flex h-6 items-center justify-center gap-2 border-b-2 tt-floor-in"
            style={{ width: `${Math.round(f.radius * 44)}px`, background: color[f.style], borderColor: skin.trim }}
          >
            <span className="h-3 w-2 rounded-t-full" style={{ background: skin.window }} />
            <span className="h-3 w-2 rounded-t-full" style={{ background: skin.windowGlow }} />
          </div>
        ))}
        <div className="h-4 w-36 rounded-sm" style={{ background: skin.foundation }} />
        <div className="h-8 w-64 rounded-b-[60%] bg-[#7ed957] shadow-[0_8px_0_#b8835a]" />
      </div>
    </div>
  );
}
