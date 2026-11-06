/** Turns pure FloorSpecs (from game-core) into renderable low-poly parts. */
import { TOWER_SIDES, hasWindow, type FloorSpec, type TowerSkin } from "@triviatowers/game-core";
import type { Part } from "./parts";

const FACE = (Math.PI * 2) / TOWER_SIDES;
const APOTHEM = Math.cos(Math.PI / TOWER_SIDES);

/** Angle (radians) of the centre of face `i` around the Y axis. */
export function faceAngle(i: number): number {
  return (i + 0.5) * FACE;
}

function onFace(i: number, dist: number): { x: number; z: number; ry: number } {
  const a = faceAngle(i);
  return { x: Math.sin(a) * dist, z: Math.cos(a) * dist, ry: a };
}

function wallColor(spec: FloorSpec, skin: TowerSkin): string {
  switch (spec.style) {
    case "stone": return skin.stone;
    case "brick": return skin.brick;
    case "timber": return skin.timber;
    case "castle": return skin.castle;
  }
}

export function floorParts(spec: FloorSpec, skin: TowerSkin): Part[] {
  const r = spec.radius;
  const h = spec.height;
  const parts: Part[] = [];
  const wall = wallColor(spec, skin);
  const accent = skin.accents[spec.accentIndex % skin.accents.length] as string;

  // Body + ledge.
  parts.push({ prim: "prism8", color: wall, pos: [0, 0, 0], scale: [r, h * 0.9, r] });
  parts.push({ prim: "prism8", color: skin.trim, pos: [0, h * 0.88, 0], scale: [r * 1.08, h * 0.12, r * 1.08] });

  // Windows.
  for (let i = 0; i < TOWER_SIDES; i++) {
    if (!hasWindow(spec, i)) continue;
    const { x, z, ry } = onFace(i, r * APOTHEM);
    const lit = ((spec.windowMask >> i) + spec.index) % 3 === 0;
    const wy = h * 0.42;
    parts.push({ prim: "box", color: skin.trim, pos: [x, wy, z], rot: [0, ry, 0], scale: [0.38, 0.5, 0.06] });
    parts.push({
      prim: "box",
      color: lit ? skin.windowGlow : skin.window,
      glow: lit,
      pos: [x * 1.01, wy, z * 1.01],
      rot: [0, ry, 0],
      scale: [0.26, 0.38, 0.06],
    });
    if (spec.arched) {
      parts.push({ prim: "halfDisc", color: skin.trim, pos: [x, wy + 0.25, z], rot: [0, ry, 0], scale: [0.19, 0.19, 0.06] });
      parts.push({
        prim: "halfDisc",
        color: lit ? skin.windowGlow : skin.window,
        glow: lit,
        pos: [x * 1.01, wy + 0.19, z * 1.01],
        rot: [0, ry, 0],
        scale: [0.13, 0.13, 0.06],
      });
    }
  }

  // Style details.
  if (spec.style === "timber") {
    for (let i = 0; i < TOWER_SIDES; i++) {
      const a = i * FACE;
      parts.push({ prim: "box", color: skin.timberBeam, pos: [Math.sin(a) * r, h * 0.45, Math.cos(a) * r], rot: [0, a, 0], scale: [0.1, h * 0.9, 0.1] });
    }
    parts.push({ prim: "prism8", color: skin.timberBeam, pos: [0, h * 0.06, 0], scale: [r * 1.02, 0.08, r * 1.02] });
  } else if (spec.style === "brick") {
    parts.push({ prim: "prism8", color: skin.trim, pos: [0, h * 0.3, 0], scale: [r * 1.01, 0.03, r * 1.01] });
    parts.push({ prim: "prism8", color: skin.trim, pos: [0, h * 0.62, 0], scale: [r * 1.01, 0.03, r * 1.01] });
  } else if (spec.style === "stone") {
    for (let i = 0; i < TOWER_SIDES; i += 3) {
      const { x, z, ry } = onFace((i + spec.index) % TOWER_SIDES, r * APOTHEM);
      parts.push({ prim: "box", color: skin.foundation, pos: [x, h * 0.15, z], rot: [0, ry, 0], scale: [0.5, 0.18, 0.1] });
    }
  }

  // Features.
  if (spec.feature === "battlements") {
    for (let i = 0; i < TOWER_SIDES * 2; i += 2) {
      const a = (i + 0.5) * (FACE / 2);
      const d = r * 1.04;
      parts.push({ prim: "box", color: wall, pos: [Math.sin(a) * d, h + 0.08, Math.cos(a) * d], rot: [0, a, 0], scale: [0.26, 0.2, 0.18] });
    }
  } else if (spec.feature === "balcony") {
    const br = r * 1.38;
    parts.push({ prim: "disc16", color: skin.trim, pos: [0, h * 0.86, 0], scale: [br, 0.1, br] });
    parts.push({ prim: "torus8", color: skin.timberBeam, pos: [0, h * 0.86 + 0.32, 0], scale: [br * 0.97, 1, br * 0.97] });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      parts.push({ prim: "prism6", color: skin.timberBeam, pos: [Math.sin(a) * br * 0.95, h * 0.86, Math.cos(a) * br * 0.95], scale: [0.035, 0.34, 0.035] });
    }
    // Pennant string of flags.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      parts.push({ prim: "cone6", color: skin.accents[i % 4] as string, pos: [Math.sin(a) * br * 0.96, h * 0.86 + 0.18, Math.cos(a) * br * 0.96], rot: [Math.PI, a, 0], scale: [0.07, 0.14, 0.03] });
    }
  } else if (spec.feature === "garden") {
    for (let i = 0; i < 5; i++) {
      const a = faceAngle((i * 2 + spec.index) % TOWER_SIDES) + 0.2 * i;
      const d = r * 1.04;
      parts.push({ prim: "ico", color: i % 2 ? "#5cc66b" : "#46b35a", pos: [Math.sin(a) * d, h * 0.98, Math.cos(a) * d], scale: [0.16, 0.13, 0.16] });
      if (i % 2 === 0) parts.push({ prim: "ico", color: accent, pos: [Math.sin(a) * d, h * 1.08, Math.cos(a) * d], scale: [0.05, 0.05, 0.05] });
    }
  }

  // Hanging banner.
  if (spec.bannerFace >= 0) {
    const { x, z, ry } = onFace(spec.bannerFace, r * APOTHEM + 0.05);
    parts.push({ prim: "box", color: accent, pos: [x, h * 0.5, z], rot: [0, ry, 0], scale: [0.34, 0.58, 0.03] });
    parts.push({ prim: "box", color: skin.trim, pos: [x, h * 0.5, z], rot: [0, ry, 0], scale: [0.14, 0.14, 0.035] });
    parts.push({ prim: "box", color: skin.timberBeam, pos: [x, h * 0.8, z], rot: [0, ry, 0], scale: [0.44, 0.05, 0.05] });
  }

  return parts;
}

export function foundationParts(skin: TowerSkin): Part[] {
  const parts: Part[] = [
    { prim: "prism8", color: skin.foundation, pos: [0, 0, 0], scale: [2.15, 0.25, 2.15] },
    { prim: "prism8", color: skin.stone, pos: [0, 0.25, 0], scale: [1.85, 0.35, 1.85] },
    { prim: "prism8", color: skin.trim, pos: [0, 0.52, 0], scale: [1.92, 0.08, 1.92] },
  ];
  // Front door + steps, facing the default camera.
  const { x, z, ry } = onFace(1, 1.85 * APOTHEM);
  parts.push({ prim: "box", color: skin.foundation, pos: [x * 1.12, 0.12, z * 1.12], rot: [0, ry, 0], scale: [0.9, 0.24, 0.5] });
  parts.push({ prim: "box", color: skin.timberBeam, pos: [x, 0.42, z], rot: [0, ry, 0], scale: [0.48, 0.34, 0.08] });
  return parts;
}

export function roofParts(radius: number, skin: TowerSkin, flagColor: string): Part[] {
  return [
    { prim: "prism8", color: skin.trim, pos: [0, 0, 0], scale: [radius * 1.18, 0.12, radius * 1.18] },
    { prim: "cone8", color: skin.roof, pos: [0, 0.12, 0], scale: [radius * 1.22, 1.5, radius * 1.22] },
    { prim: "ico", color: skin.windowGlow, pos: [0, 1.66, 0], scale: [0.12, 0.12, 0.12] },
    { prim: "prism6", color: skin.timberBeam, pos: [0, 1.6, 0], scale: [0.03, 0.9, 0.03] },
    { prim: "box", color: flagColor, pos: [0.25, 2.3, 0], scale: [0.48, 0.28, 0.03] },
  ];
}
