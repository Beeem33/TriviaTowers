"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { generateTower, floorBaseY, floorRadius, TOWER_SKINS, DEFAULT_SKIN_ID, type FloorSpec, type TowerSkin } from "@triviatowers/game-core";
import { Merged } from "./Merged";
import { floorParts, foundationParts, roofParts } from "./towerParts";
import { fx } from "./fx";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

/** Floors swoop in from the camera's right-hand side. */
const ENTRY_ANGLE = Math.PI / 4 + Math.PI / 2;
const BUILD_DURATION = 0.75;
const SQUASH_DURATION = 0.35;

function Floor({ spec, skin, skinId, seed, animate, reducedMotion }: {
  spec: FloorSpec;
  skin: TowerSkin;
  skinId: string;
  seed: number;
  animate: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const born = useRef<number | null>(animate ? null : -Infinity);
  const landed = useRef(!animate);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const now = clock.elapsedTime;
    if (born.current === null) born.current = now;
    const t = now - born.current;
    const duration = reducedMotion ? 0.25 : BUILD_DURATION;

    if (t < duration) {
      const p = clamp01(t / duration);
      if (reducedMotion) {
        g.position.set(0, spec.y, 0);
        g.rotation.y = spec.rotation;
        g.scale.setScalar(0.85 + 0.15 * easeOutCubic(p));
        return;
      }
      const e = easeOutCubic(p);
      const dist = 3.6 * (1 - e);
      g.position.set(Math.sin(ENTRY_ANGLE) * dist, spec.y + 2.4 * (1 - e) + Math.sin(Math.PI * p) * 0.5, Math.cos(ENTRY_ANGLE) * dist);
      g.rotation.y = spec.rotation + (1 - e) * Math.PI * 1.5;
      g.scale.setScalar(0.35 + 0.65 * easeOutBack(p));
      return;
    }

    if (!landed.current) {
      landed.current = true;
      if (!reducedMotion) {
        fx.emit({ kind: "dust", y: spec.y, radius: spec.radius * 1.05 });
        if (spec.index % 5 === 0) fx.emit({ kind: "confetti", y: spec.y + 1, amount: 50 });
      }
    }
    g.position.set(0, spec.y, 0);
    g.rotation.y = spec.rotation;
    const q = (t - duration) / SQUASH_DURATION;
    if (!reducedMotion && q < 1) {
      const s = Math.sin(Math.PI * q) * (1 - q) * 0.22;
      g.scale.set(1 + s * 0.6, 1 - s, 1 + s * 0.6);
    } else {
      g.scale.setScalar(1);
    }
  });

  return (
    <group ref={group} position={[0, spec.y, 0]} rotation={[0, spec.rotation, 0]} scale={animate ? 0.001 : 1}>
      <Merged buildKey={`${seed}|${spec.index}|${skinId}`} build={() => floorParts(spec, skin)} />
    </group>
  );
}

function Roof({ topY, radius, skin, skinId, buildTick, wobbleTick, reducedMotion }: {
  topY: number;
  radius: number;
  skin: TowerSkin;
  skinId: string;
  buildTick: number;
  wobbleTick: number;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const y = useRef(topY);
  const v = useRef(0);
  const spin = useRef(0);
  const lastBuild = useRef(buildTick);
  const lastWobble = useRef(wobbleTick);

  useEffect(() => {
    if (buildTick !== lastBuild.current) {
      lastBuild.current = buildTick;
      if (!reducedMotion) {
        v.current += 11; // pop the roof off so the new floor can slide in underneath
        spin.current += 6;
      }
    }
  }, [buildTick, reducedMotion]);
  useEffect(() => {
    if (wobbleTick !== lastWobble.current) {
      lastWobble.current = wobbleTick;
      if (!reducedMotion) v.current += 4.5;
    }
  }, [wobbleTick, reducedMotion]);

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDt, 1 / 30);
    if (reducedMotion) {
      y.current += (topY - y.current) * Math.min(1, dt * 10);
      v.current = 0;
    } else {
      // Damped spring toward the current top of the tower.
      const a = 85 * (topY - y.current) - 9 * v.current;
      v.current += a * dt;
      y.current += v.current * dt;
      if (y.current < topY - 0.02 && v.current < 0) {
        y.current = topY; // never sink into the tower
        v.current = -v.current * 0.25;
      }
    }
    spin.current *= 1 - Math.min(1, dt * 3);
    g.position.y = y.current;
    g.rotation.y += spin.current * dt;
  });

  return (
    <group ref={group} position={[0, topY, 0]}>
      <Merged buildKey={`roof|${radius.toFixed(3)}|${skinId}`} build={() => roofParts(radius, skin, skin.accents[0])} />
    </group>
  );
}

export interface TowerProps {
  floors: number;
  seed: number;
  skinId?: string;
  buildTick?: number;
  wobbleTick?: number;
  reducedMotion?: boolean;
}

export function towerTopY(floors: number): number {
  return floorBaseY(floors + 1);
}

export function Tower({ floors, seed, skinId = DEFAULT_SKIN_ID, buildTick = 0, wobbleTick = 0, reducedMotion = false }: TowerProps) {
  const skin = TOWER_SKINS[skinId] ?? (TOWER_SKINS[DEFAULT_SKIN_ID] as TowerSkin);
  const blueprint = useMemo(() => generateTower(seed, floors), [seed, floors]);
  // Floors present on first render appear instantly; later ones animate in.
  const [initialFloors] = useState(floors);
  const body = useRef<THREE.Group>(null);
  const wobbleStart = useRef<number | null>(null);
  const lastWobble = useRef(wobbleTick);
  const pendingWobble = useRef(false);

  useEffect(() => {
    if (wobbleTick !== lastWobble.current) {
      lastWobble.current = wobbleTick;
      pendingWobble.current = true;
    }
  }, [wobbleTick]);

  useFrame(({ clock }) => {
    const g = body.current;
    if (!g) return;
    if (pendingWobble.current) {
      pendingWobble.current = false;
      wobbleStart.current = clock.elapsedTime;
    }
    if (wobbleStart.current === null) return;
    const t = clock.elapsedTime - wobbleStart.current;
    if (t > 2) {
      g.rotation.set(0, 0, 0);
      wobbleStart.current = null;
      return;
    }
    // Taller towers sway through a smaller angle so the top doesn't fly around.
    const amp = (reducedMotion ? 0.012 : 0.075) * Math.min(1, 6 / (floors + 3));
    const decay = Math.exp(-2.6 * t);
    g.rotation.z = amp * decay * Math.sin(14 * t);
    g.rotation.x = amp * 0.6 * decay * Math.sin(11 * t + 0.8);
  });

  return (
    <group>
      <Merged buildKey={`foundation|${skinId}`} build={() => foundationParts(skin)} />
      <group ref={body}>
        {blueprint.floors.map((spec) => (
          <Floor
            key={spec.index}
            spec={spec}
            skin={skin}
            skinId={skin.id}
            seed={seed}
            animate={spec.index > initialFloors}
            reducedMotion={reducedMotion}
          />
        ))}
        <Roof
          topY={blueprint.topY}
          radius={floors === 0 ? floorRadius(1) : blueprint.topRadius}
          skin={skin}
          skinId={skin.id}
          buildTick={buildTick}
          wobbleTick={wobbleTick}
          reducedMotion={reducedMotion}
        />
      </group>
    </group>
  );
}
