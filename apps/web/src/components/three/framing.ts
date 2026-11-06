import { floorBaseY } from "@triviatowers/game-core";

export type SceneMode = "home" | "intro" | "game" | "results";

const ROOF_CLEARANCE = 2.9; // roof + flag above the top floor
const HALF_FOV_TAN = Math.tan(((35 / 2) * Math.PI) / 180);

/**
 * Where the camera should look and how far away it should be, for a tower of `floors`.
 *  - game: keep the roof and the newest floors in view; the base drops away as it grows.
 *  - home/results: frame the whole tower and island (results = the trophy shot).
 */
export function frameFor(mode: SceneMode, floors: number, aspect: number): { focusY: number; distance: number } {
  const topY = floorBaseY(floors + 1);
  // Narrow (portrait) viewports need extra distance to fit the island's width.
  const narrow = aspect < 1 ? 1 + (1 - aspect) * 0.8 : 1;
  if (mode === "intro") {
    return { focusY: 6, distance: 34 };
  }
  if (mode === "game") {
    const distance = (16 + Math.min(topY, 20) * 0.5) * narrow;
    const half = distance * HALF_FOV_TAN;
    return { focusY: Math.max(1.2, topY + ROOF_CLEARANCE - half * 0.95), distance };
  }
  const bottom = -1.8;
  const top = topY + ROOF_CLEARANCE;
  const half = ((top - bottom) / 2) * 1.12;
  const distance = Math.max(mode === "home" ? 19 : 20, half / HALF_FOV_TAN) * narrow;
  return { focusY: (top + bottom) / 2, distance };
}
