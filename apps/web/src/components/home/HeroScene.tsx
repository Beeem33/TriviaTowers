"use client";
import { useEffect, useState } from "react";
import { SceneView } from "@/components/three/SceneView";
import { useReducedMotion } from "@/game/useReducedMotion";
import { towerSeed } from "@triviatowers/game-core";

const DEMO_FLOORS = 7;

/** Homepage island: the demo tower builds itself floor by floor, then wobbles for fun. */
export function HeroScene() {
  const reduced = useReducedMotion();
  const [builtFloors, setFloors] = useState(1);
  const floors = reduced ? DEMO_FLOORS : builtFloors;
  const [buildTick, setBuildTick] = useState(0);
  const [wobbleTick, setWobbleTick] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let f = 1;
    const id = window.setInterval(() => {
      if (f < DEMO_FLOORS) {
        f++;
        setFloors(f);
        setBuildTick((t) => t + 1);
      } else {
        setWobbleTick((t) => t + 1);
        window.clearInterval(id);
      }
    }, 1100);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <SceneView
      mode="home"
      floors={floors}
      seed={towerSeed("homepage-demo")}
      buildTick={buildTick}
      wobbleTick={wobbleTick}
      reducedMotion={reduced}
      interactive={false}
      towerKey={reduced ? "static" : "anim"}
      label="A floating low-poly island with a colourful tower being built floor by floor"
    />
  );
}
