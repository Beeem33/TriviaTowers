"use client";
import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import type * as THREE from "three";
import { useSettings } from "@/game/settings-store";
import { Island } from "./Island";
import { Tower } from "./Tower";
import { Clouds } from "./Clouds";
import { Particles } from "./Particles";
import { CameraRig } from "./CameraRig";
import { frameFor, type SceneMode } from "./framing";
import { registerCapture } from "./capture";

export interface TowerSceneProps {
  mode: SceneMode;
  floors: number;
  seed: number;
  skinId?: string;
  buildTick?: number;
  wobbleTick?: number;
  reducedMotion: boolean;
  interactive?: boolean;
  /** Changing this remounts the tower (new match). */
  towerKey?: string | number;
  label: string;
}

function CaptureBridge() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    registerCapture(() => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    });
    return () => registerCapture(null);
  }, [gl, scene, camera]);
  return null;
}

function Bob({ children, reducedMotion }: { children: React.ReactNode; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.6) * 0.12;
  });
  return <group ref={ref}>{children}</group>;
}

function SunLight({ mode, floors, shadowSize }: { mode: SceneMode; floors: number; shadowSize: number }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const { size } = useThree();
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const { focusY } = frameFor(mode === "intro" ? "game" : mode, floors, size.width / Math.max(1, size.height));
    const y = Math.max(0, focusY - 3);
    l.position.set(7, y + 12, 5);
    l.target.position.set(0, y, 0);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      intensity={2.3}
      color="#fff4e0"
      castShadow={shadowSize > 0}
      shadow-mapSize={[shadowSize || 512, shadowSize || 512]}
      shadow-bias={-0.0008}
      shadow-normalBias={0.03}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
      shadow-camera-near={1}
      shadow-camera-far={40}
    />
  );
}

export default function TowerScene(props: TowerSceneProps) {
  const quality = useSettings((s) => s.quality);
  const autoDowngraded = useSettings((s) => s.autoDowngraded);
  const setSettings = useSettings((s) => s.set);
  const low = quality === "low" || (quality === "auto" && autoDowngraded);
  const shadowSize = low ? 0 : quality === "high" ? 2048 : 1024;
  const dpr: [number, number] = low ? [1, 1] : quality === "high" ? [1, 2] : [1, 1.75];

  return (
    <div className="absolute inset-0" role="img" aria-label={props.label}>
      <Canvas
        shadows={shadowSize > 0 ? "percentage" : false}
        dpr={dpr}
        camera={{ fov: 35, near: 0.1, far: 200, position: [20, 18, 20] }}
        gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <PerformanceMonitor
          onDecline={() => {
            if (quality === "auto" && !autoDowngraded) setSettings({ autoDowngraded: true });
          }}
        />
        <fog attach="fog" args={["#d7ecff", 30, 75]} />
        <hemisphereLight args={["#d6ecff", "#ffd7b5", 1.5]} />
        <SunLight mode={props.mode} floors={props.floors} shadowSize={shadowSize} />
        <CameraRig mode={props.mode} floors={props.floors} reducedMotion={props.reducedMotion} interactive={props.interactive ?? false} />
        <Bob reducedMotion={props.reducedMotion}>
          <Island />
          <Tower
            key={props.towerKey}
            floors={props.floors}
            seed={props.seed}
            skinId={props.skinId}
            buildTick={props.buildTick}
            wobbleTick={props.wobbleTick}
            reducedMotion={props.reducedMotion}
          />
          {!props.reducedMotion && <Particles key={low ? "low" : "high"} density={low ? 0.5 : 1} />}
        </Bob>
        <Clouds reducedMotion={props.reducedMotion} />
        <CaptureBridge />
      </Canvas>
    </div>
  );
}
