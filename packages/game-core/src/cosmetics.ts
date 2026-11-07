/**
 * Cosmetic catalogue: tower skins (palettes in tower.ts) and island themes.
 * Everything here is visual only. Items unlock by playing (level or achievement);
 * the Phase 6 shop adds purchasable items to the same catalogue.
 */
import { TOWER_SKINS } from "./tower";

export type Unlock = { type: "free" } | { type: "level"; level: number } | { type: "achievement"; id: string };

export interface IslandTheme {
  id: string;
  name: string;
  grass: string;
  dirt: string;
  rock: string;
  leaves: readonly [string, string, string];
  blossom: string;
  trunk: string;
  water: string;
  /** Water that glows (lava, starlight). */
  waterGlow: boolean;
  waterRim: string;
  flowers: readonly [string, string, string, string];
  stones: string;
  cloud: string;
  fog: string;
  /** Page background gradient, top to bottom. */
  sky: readonly [string, string, string, string];
  /** Text colour that reads directly on the sky. */
  skyInk: string;
}

export const ISLAND_THEMES: Record<string, IslandTheme> = {
  grassland: {
    id: "grassland", name: "Grassland",
    grass: "#7ed957", dirt: "#b8835a", rock: "#9a8fb0", leaves: ["#5cc66b", "#4ab35d", "#6fd47a"], blossom: "#ffb3c7",
    trunk: "#8a5a3b", water: "#5bc0eb", waterGlow: false, waterRim: "#d9e7f2", flowers: ["#ff5d73", "#ffc145", "#ffffff", "#b39dff"],
    stones: "#d8d2c4", cloud: "#ffffff", fog: "#d7ecff", sky: ["#6fbcff", "#a9dcff", "#d7ecff", "#ffe2ef"], skyInk: "#2c3a63",
  },
  desert: {
    id: "desert", name: "Desert Oasis",
    grass: "#e8c27a", dirt: "#c98f52", rock: "#b5734a", leaves: ["#5f9e4a", "#4f8a3d", "#77b35a"], blossom: "#ff8fa3",
    trunk: "#8a5a3b", water: "#3fb7c9", waterGlow: false, waterRim: "#f1dfb0", flowers: ["#ff6b6b", "#ffd166", "#ffffff", "#ff9f1c"],
    stones: "#d9c39a", cloud: "#fff6e8", fog: "#ffe9c7", sky: ["#ff9f5a", "#ffc98f", "#ffe5bf", "#fff3e0"], skyInk: "#5a3317",
  },
  snow: {
    id: "snow", name: "Snowy Peak",
    grass: "#f4f8fb", dirt: "#c9d6e3", rock: "#8796ab", leaves: ["#2f6b4f", "#3d7d5d", "#e9f1f6"], blossom: "#dbe8f5",
    trunk: "#6b4f3a", water: "#9fd3f0", waterGlow: false, waterRim: "#ffffff", flowers: ["#ffffff", "#bfe3ff", "#ffd6e8", "#d0f0ff"],
    stones: "#b0bccb", cloud: "#ffffff", fog: "#e6f0fb", sky: ["#7fa9de", "#b9d3f2", "#e1ecf9", "#f6f9ff"], skyInk: "#24395c",
  },
  volcano: {
    id: "volcano", name: "Volcano",
    grass: "#4a3f45", dirt: "#2f2629", rock: "#5b3a3a", leaves: ["#3f5f3a", "#4c6b45", "#5a7a4f"], blossom: "#c0392b",
    trunk: "#2a1f1b", water: "#ff6a1a", waterGlow: true, waterRim: "#3a2a2a", flowers: ["#ff6a1a", "#ffb347", "#ff3b3b", "#ffd166"],
    stones: "#6b5a5a", cloud: "#8a8590", fog: "#a8503a", sky: ["#2b1a2e", "#6b2d3a", "#c2573b", "#f2a65a"], skyInk: "#fde8d8",
  },
  space: {
    id: "space", name: "Space Island",
    grass: "#b8b5d6", dirt: "#8a86b0", rock: "#4b4673", leaves: ["#7ef9ff", "#b28cff", "#ff8ff1"], blossom: "#ffb3f0",
    trunk: "#3a3560", water: "#6ef3ff", waterGlow: true, waterRim: "#d9d6f0", flowers: ["#ffffff", "#7ef9ff", "#ff8ff1", "#ffe66d"],
    stones: "#9e9ac4", cloud: "#8f7ad9", fog: "#2a2350", sky: ["#0b1026", "#1f1a4a", "#3d2a6b", "#6b3a7a"], skyInk: "#e4e0ff",
  },
};

export const DEFAULT_ISLAND_ID = "grassland";

export interface CosmeticItem {
  kind: "skin" | "island";
  id: string;
  name: string;
  unlock: Unlock;
}

export const COSMETICS: readonly CosmeticItem[] = [
  { kind: "skin", id: "classic", name: TOWER_SKINS.classic!.name, unlock: { type: "free" } },
  { kind: "skin", id: "candy", name: TOWER_SKINS.candy!.name, unlock: { type: "level", level: 3 } },
  { kind: "skin", id: "castle", name: TOWER_SKINS.castle!.name, unlock: { type: "level", level: 5 } },
  { kind: "skin", id: "pirate", name: TOWER_SKINS.pirate!.name, unlock: { type: "level", level: 8 } },
  { kind: "skin", id: "futuristic", name: TOWER_SKINS.futuristic!.name, unlock: { type: "level", level: 12 } },
  { kind: "skin", id: "haunted", name: TOWER_SKINS.haunted!.name, unlock: { type: "achievement", id: "brainiac" } },
  { kind: "island", id: "grassland", name: ISLAND_THEMES.grassland!.name, unlock: { type: "free" } },
  { kind: "island", id: "desert", name: ISLAND_THEMES.desert!.name, unlock: { type: "level", level: 2 } },
  { kind: "island", id: "snow", name: ISLAND_THEMES.snow!.name, unlock: { type: "level", level: 4 } },
  { kind: "island", id: "volcano", name: ISLAND_THEMES.volcano!.name, unlock: { type: "level", level: 7 } },
  { kind: "island", id: "space", name: ISLAND_THEMES.space!.name, unlock: { type: "level", level: 10 } },
];

export function isUnlocked(item: CosmeticItem, player: { level: number; achievements: ReadonlySet<string> }): boolean {
  switch (item.unlock.type) {
    case "free": return true;
    case "level": return player.level >= item.unlock.level;
    case "achievement": return player.achievements.has(item.unlock.id);
  }
}

/** Items that became available when going from `before` to `after`. */
export function newlyUnlocked(
  before: { level: number; achievements: ReadonlySet<string> },
  after: { level: number; achievements: ReadonlySet<string> },
): CosmeticItem[] {
  return COSMETICS.filter((c) => !isUnlocked(c, before) && isUnlocked(c, after));
}
