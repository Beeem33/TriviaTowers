"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { createRng } from "@triviatowers/game-core";
import { Merged } from "./Merged";
import type { Part } from "./parts";

function cloudRing(seed: number, count: number, radius: [number, number], y: [number, number], size: number): Part[] {
  const rng = createRng(seed);
  const parts: Part[] = [];
  for (let c = 0; c < count; c++) {
    const a = (c / count) * Math.PI * 2 + rng() * 0.6;
    const r = radius[0] + rng() * (radius[1] - radius[0]);
    const cx = Math.sin(a) * r;
    const cz = Math.cos(a) * r;
    const cy = y[0] + rng() * (y[1] - y[0]);
    const puffs = 3 + Math.floor(rng() * 3);
    for (let p = 0; p < puffs; p++) {
      const s = size * (0.6 + rng() * 0.6);
      parts.push({
        prim: "ico",
        color: p % 2 ? "#ffffff" : "#f4f7ff",
        pos: [cx + (p - puffs / 2) * size * 0.8, cy + rng() * size * 0.3, cz + (rng() - 0.5) * size],
        scale: [s * 1.2, s * 0.8, s],
      });
    }
  }
  return parts;
}

export function Clouds({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const below = useRef<THREE.Group>(null);
  const far = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (reducedMotion) return;
    if (below.current) below.current.rotation.y += dt * 0.02;
    if (far.current) far.current.rotation.y -= dt * 0.008;
  });
  return (
    <>
      <group ref={below}>
        <Merged buildKey="clouds-below" build={() => cloudRing(3, 9, [7, 13], [-9, -6], 1.4)} castShadow={false} receiveShadow={false} />
      </group>
      <group ref={far}>
        <Merged buildKey="clouds-far" build={() => cloudRing(5, 10, [22, 30], [-4, 8], 2.2)} castShadow={false} receiveShadow={false} />
      </group>
    </>
  );
}
