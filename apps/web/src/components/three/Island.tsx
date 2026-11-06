"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { createRng, hashString } from "@triviatowers/game-core";
import { Merged } from "./Merged";
import { material, type Part } from "./parts";

/** Moves each vertex outward/inward by a noise value keyed on its angle, so seams stay closed. */
function jitterRadial(geo: THREE.BufferGeometry, amount: number, yAmount: number, seed: number) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const angleKey = Math.round(Math.atan2(x, z) * 1000);
    const yKey = Math.round(y * 100);
    const n1 = (hashString(`${seed}|${angleKey}`) / 0xffffffff) * 2 - 1;
    const n2 = (hashString(`${seed}|${angleKey}|${yKey}`) / 0xffffffff) * 2 - 1;
    const k = 1 + (n1 * amount) / Math.max(1, r);
    pos.setXYZ(i, x * k, y + n2 * yAmount, z * k);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function useIslandGeometries() {
  const geos = useMemo(() => {
    const grass = new THREE.CylinderGeometry(6.1, 5.95, 0.3, 18, 1).translate(0, -0.15, 0);
    jitterRadial(grass, 0.35, 0.03, 11);
    const dirt = new THREE.CylinderGeometry(5.95, 5.3, 0.7, 18, 1).translate(0, -0.65, 0);
    jitterRadial(dirt, 0.35, 0.08, 11);
    const rock = new THREE.ConeGeometry(5.3, 5.8, 12, 3).rotateX(Math.PI).translate(0, -3.9, 0);
    jitterRadial(rock, 0.7, 0.35, 23);
    return { grass, dirt, rock };
  }, []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  return geos;
}

const GREENS = ["#5cc66b", "#4ab35d", "#6fd47a"];

function polar(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [Math.sin(a) * r, Math.cos(a) * r];
}

function pine(deg: number, r: number, s: number): Part[] {
  const [x, z] = polar(deg, r);
  return [
    { prim: "prism6", color: "#8a5a3b", pos: [x, 0, z], scale: [0.12 * s, 0.5 * s, 0.12 * s] },
    { prim: "cone8", color: GREENS[1] as string, pos: [x, 0.4 * s, z], scale: [0.75 * s, 1.0 * s, 0.75 * s] },
    { prim: "cone8", color: GREENS[0] as string, pos: [x, 0.9 * s, z], scale: [0.58 * s, 0.85 * s, 0.58 * s] },
    { prim: "cone8", color: GREENS[2] as string, pos: [x, 1.35 * s, z], scale: [0.4 * s, 0.7 * s, 0.4 * s] },
  ];
}

function roundTree(deg: number, r: number, s: number, leaf: string): Part[] {
  const [x, z] = polar(deg, r);
  return [
    { prim: "prism6", color: "#8a5a3b", pos: [x, 0, z], scale: [0.13 * s, 0.8 * s, 0.13 * s] },
    { prim: "ico", color: leaf, pos: [x, 1.15 * s, z], scale: [0.62 * s, 0.56 * s, 0.62 * s] },
    { prim: "ico", color: leaf, pos: [x + 0.32 * s, 0.95 * s, z + 0.1 * s], scale: [0.36 * s, 0.32 * s, 0.36 * s] },
  ];
}

function islandParts(): Part[] {
  const rng = createRng(7);
  const parts: Part[] = [];
  parts.push(...pine(200, 4.5, 1.25), ...pine(172, 5.0, 0.95), ...pine(268, 4.7, 1.1), ...pine(18, 5.2, 0.75));
  parts.push(...roundTree(232, 3.5, 1.05, "#6fd47a"), ...roundTree(300, 5.0, 0.95, "#ffb3c7"), ...roundTree(128, 4.9, 0.85, "#5cc66b"));

  // Pond.
  const [px, pz] = polar(322, 3.8);
  parts.push({ prim: "disc16", color: "#d9e7f2", pos: [px, -0.01, pz], scale: [1.05, 0.05, 0.8] });
  parts.push({ prim: "disc16", color: "#5bc0eb", pos: [px, 0.0, pz], scale: [0.9, 0.06, 0.68] });

  // Stepping stones toward the door (door faces ~67.5°).
  for (let i = 0; i < 4; i++) {
    const [x, z] = polar(67.5 + (i % 2 ? 4 : -4), 2.75 + i * 0.75);
    parts.push({ prim: "prism6", color: "#d8d2c4", pos: [x, -0.02, z], rot: [0, i, 0], scale: [0.32, 0.06, 0.26] });
  }

  // Rocks.
  for (const [deg, r, s] of [[95, 5.2, 0.35], [250, 5.4, 0.45], [150, 3.3, 0.25], [340, 5.3, 0.3], [30, 3.9, 0.22]] as const) {
    const [x, z] = polar(deg, r);
    parts.push({ prim: "dodeca", color: "#a8adb8", pos: [x, s * 0.4, z], rot: [rng(), rng(), rng()], scale: [s, s * 0.75, s] });
  }

  // Bushes, grass tufts and flowers.
  const flowerColors = ["#ff5d73", "#ffc145", "#ffffff", "#b39dff"];
  for (let i = 0; i < 26; i++) {
    const deg = rng() * 360;
    const r = 2.7 + rng() * 2.9;
    const [x, z] = polar(deg, r);
    const kind = rng();
    if (kind < 0.35) {
      parts.push({ prim: "ico", color: GREENS[i % 3] as string, pos: [x, 0.12, z], scale: [0.28, 0.22, 0.28] });
    } else if (kind < 0.7) {
      parts.push({ prim: "cone6", color: GREENS[(i + 1) % 3] as string, pos: [x, 0, z], scale: [0.07, 0.28, 0.07] });
      parts.push({ prim: "cone6", color: GREENS[i % 3] as string, pos: [x + 0.08, 0, z + 0.05], scale: [0.06, 0.22, 0.06] });
    } else {
      parts.push({ prim: "prism6", color: "#4ab35d", pos: [x, 0, z], scale: [0.02, 0.18, 0.02] });
      parts.push({ prim: "ico", color: flowerColors[i % 4] as string, pos: [x, 0.2, z], scale: [0.07, 0.07, 0.07] });
    }
  }

  // A few rocks hanging under the island.
  for (const [deg, r, y, s] of [[60, 3.6, -1.6, 0.6], [200, 3.2, -2.2, 0.8], [300, 2.4, -3.6, 0.5]] as const) {
    const [x, z] = polar(deg, r);
    parts.push({ prim: "dodeca", color: "#8f8a9e", pos: [x, y, z], rot: [rng(), rng(), rng()], scale: [s, s * 1.3, s] });
  }
  return parts;
}

export function Island() {
  const { grass, dirt, rock } = useIslandGeometries();
  return (
    <group>
      <mesh geometry={grass} material={material("#7ed957")} receiveShadow />
      <mesh geometry={dirt} material={material("#b8835a")} receiveShadow />
      <mesh geometry={rock} material={material("#9a8fb0")} />
      <Merged buildKey="island-decor" build={islandParts} />
    </group>
  );
}
