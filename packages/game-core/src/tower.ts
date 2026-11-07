/**
 * Procedural tower blueprints.
 *
 * The renderer never invents geometry on its own: it asks this module for a list of
 * FloorSpecs and draws them. Blueprints are deterministic (same seed + floor count ->
 * same tower) so a player's finished tower can be re-rendered for share cards,
 * profiles and opponents' screens from just `{ seed, floors, skinId }`.
 */
import { createRng, hashString } from "./random";

export const FLOOR_HEIGHT = 1;
export const FOUNDATION_HEIGHT = 0.6;
export const BASE_RADIUS = 1.55;
export const MIN_RADIUS_FACTOR = 0.72;
export const TOWER_SIDES = 8;

export type FloorStyle = "stone" | "brick" | "timber" | "castle";
export type FloorFeature = "none" | "balcony" | "battlements" | "garden";

export interface FloorSpec {
  /** 1-based floor number (the foundation is not a floor). */
  index: number;
  style: FloorStyle;
  /** Y of the floor's base. */
  y: number;
  height: number;
  radius: number;
  /** Twist around the vertical axis, in radians (always a multiple of half a face). */
  rotation: number;
  /** Bitmask over TOWER_SIDES faces: which faces have windows. */
  windowMask: number;
  arched: boolean;
  feature: FloorFeature;
  /** Face index with a hanging banner, or -1. */
  bannerFace: number;
  /** Index into the skin's accent palette. */
  accentIndex: number;
}

export interface TowerBlueprint {
  seed: number;
  floors: FloorSpec[];
  /** Y where the roof sits. */
  topY: number;
  topRadius: number;
}

const STYLES: readonly FloorStyle[] = ["stone", "brick", "timber", "castle"];

function styleWeights(index: number): number[] {
  // Heavier materials near the base, lighter higher up.
  if (index <= 2) return [6, 3, 1, 1];
  if (index <= 6) return [3, 4, 3, 2];
  return [2, 3, 4, 3];
}

function weightedPick(weights: number[], rng: () => number, exclude?: number): number {
  const w = weights.map((v, i) => (i === exclude ? 0 : v));
  const total = w.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < w.length; i++) {
    r -= w[i] as number;
    if (r < 0) return i;
  }
  return w.length - 1;
}

export function floorRadius(index: number): number {
  const taper = MIN_RADIUS_FACTOR + (1 - MIN_RADIUS_FACTOR) * Math.exp(-index / 14);
  return BASE_RADIUS * taper;
}

export function floorBaseY(index: number): number {
  return FOUNDATION_HEIGHT + (index - 1) * FLOOR_HEIGHT;
}

export function towerSeed(...parts: string[]): number {
  return hashString(parts.join("|"));
}

export function generateTower(seed: number, floorCount: number): TowerBlueprint {
  const rng = createRng(seed);
  const floors: FloorSpec[] = [];
  let prevStyle = -1;
  let runLength = 0;
  const halfFace = Math.PI / TOWER_SIDES;

  for (let index = 1; index <= floorCount; index++) {
    // Avoid more than two identical styles in a row.
    const exclude = runLength >= 2 ? prevStyle : undefined;
    const styleIdx = weightedPick(styleWeights(index), rng, exclude);
    runLength = styleIdx === prevStyle ? runLength + 1 : 1;
    prevStyle = styleIdx;
    const style = STYLES[styleIdx] as FloorStyle;

    const milestone = index % 5 === 0;
    let feature: FloorFeature = "none";
    if (milestone) feature = "balcony";
    else if (style === "castle") feature = "battlements";
    else if (index > 2 && rng() < 0.18) feature = "garden";

    // Windows: 2–5 faces, spread around the tower, always at least one facing the camera side.
    let windowMask = 0;
    const windowCount = 2 + Math.floor(rng() * 4);
    const start = Math.floor(rng() * TOWER_SIDES);
    const stride = TOWER_SIDES / windowCount;
    for (let w = 0; w < windowCount; w++) {
      windowMask |= 1 << (Math.floor(start + w * stride) % TOWER_SIDES);
    }
    windowMask |= 1 << 1; // front-right face (default camera view)

    floors.push({
      index,
      style,
      y: floorBaseY(index),
      height: FLOOR_HEIGHT,
      radius: floorRadius(index) * (style === "timber" ? 1.04 : 1),
      rotation: (rng() < 0.3 ? halfFace : 0),
      windowMask,
      arched: style === "brick" || style === "castle" ? rng() < 0.7 : rng() < 0.2,
      feature,
      bannerFace: milestone || rng() < 0.22 ? Math.floor(rng() * TOWER_SIDES) : -1,
      accentIndex: Math.floor(rng() * 4),
    });
  }

  const topY = floorBaseY(floorCount + 1);
  return { seed, floors, topY, topRadius: floorRadius(floorCount + 1) };
}

export function hasWindow(spec: FloorSpec, face: number): boolean {
  return (spec.windowMask & (1 << face)) !== 0;
}

/** Cosmetic palettes. Skins are pure data so the shop, renderer and server agree. */
export interface TowerSkin {
  id: string;
  name: string;
  foundation: string;
  stone: string;
  brick: string;
  timber: string;
  timberBeam: string;
  castle: string;
  trim: string;
  roof: string;
  window: string;
  windowGlow: string;
  accents: readonly [string, string, string, string];
}

export const TOWER_SKINS: Record<string, TowerSkin> = {
  classic: {
    id: "classic",
    name: "Classic Stone",
    foundation: "#8d94a6",
    stone: "#c9cdd8",
    brick: "#e07a5f",
    timber: "#f4e3c1",
    timberBeam: "#7a4e2d",
    castle: "#b8bfd0",
    trim: "#f2efe8",
    roof: "#4f6bed",
    window: "#2b2d55",
    windowGlow: "#ffd36e",
    accents: ["#ff5d73", "#ffc145", "#3ec7a6", "#7b6cf6"],
  },
  candy: {
    id: "candy",
    name: "Candy Tower",
    foundation: "#e9a6c9",
    stone: "#ffd6e8",
    brick: "#ff8fb8",
    timber: "#fff2c9",
    timberBeam: "#9c5fd6",
    castle: "#c9b6ff",
    trim: "#ffffff",
    roof: "#ff4f9a",
    window: "#6b2d78",
    windowGlow: "#fff59e",
    accents: ["#5ee0d2", "#ffe066", "#ff6fae", "#9e7bff"],
  },
  castle: {
    id: "castle",
    name: "Medieval Castle",
    foundation: "#6f6a63",
    stone: "#a39e95",
    brick: "#8c7a6b",
    timber: "#c9b79c",
    timberBeam: "#4a3a2c",
    castle: "#9a958c",
    trim: "#d8d2c6",
    roof: "#7a2e3a",
    window: "#1f1d2b",
    windowGlow: "#ffb347",
    accents: ["#b8333f", "#e8c547", "#2f5d8a", "#4c8a3f"],
  },
  pirate: {
    id: "pirate",
    name: "Pirate Tower",
    foundation: "#5b4636",
    stone: "#8a6f55",
    brick: "#a0522d",
    timber: "#c49a6c",
    timberBeam: "#3b2a1e",
    castle: "#7a6a58",
    trim: "#e9dcc0",
    roof: "#1f2a36",
    window: "#14202b",
    windowGlow: "#ffd36e",
    accents: ["#d62828", "#f7f7f2", "#1d3557", "#e9c46a"],
  },
  futuristic: {
    id: "futuristic",
    name: "Futuristic Tower",
    foundation: "#3b4252",
    stone: "#e5ecf4",
    brick: "#7aa2f7",
    timber: "#c0caf5",
    timberBeam: "#2e3440",
    castle: "#9aa5ce",
    trim: "#ffffff",
    roof: "#00c2ff",
    window: "#0b1d33",
    windowGlow: "#6ef3ff",
    accents: ["#ff4fd8", "#00e5a0", "#ffd166", "#7b6cf6"],
  },
  haunted: {
    id: "haunted",
    name: "Haunted Tower",
    foundation: "#3d3a4a",
    stone: "#6b6680",
    brick: "#5a4e6b",
    timber: "#8a8299",
    timberBeam: "#2a2633",
    castle: "#57526a",
    trim: "#a7a0b8",
    roof: "#2d2a3a",
    window: "#120f1a",
    windowGlow: "#9dff6e",
    accents: ["#ff7a1a", "#9dff6e", "#b28cff", "#e0e0e0"],
  },
};

export const DEFAULT_SKIN_ID = "classic";
