"use client";
/**
 * Client-only wrapper: lazy-loads three.js, detects WebGL, and falls back to a 2D tower
 * when WebGL is unavailable or the 3D scene crashes.
 */
import { Component, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { hasWebGL } from "./webgl";
import { TowerFallback } from "./TowerFallback";
import type { TowerSceneProps } from "./TowerScene";

const noopSubscribe = () => () => {};

const TowerScene = dynamic(() => import("./TowerScene"), { ssr: false, loading: () => null });

class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[TriviaTowers] 3D scene failed, using 2D fallback", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function SceneView(props: TowerSceneProps) {
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => null);
  const fallback = <TowerFallback floors={props.floors} wobbleTick={props.wobbleTick ?? 0} label={props.label} />;
  if (webgl === null) return null;
  if (!webgl) return fallback;
  return (
    <SceneErrorBoundary fallback={fallback}>
      <TowerScene {...props} />
    </SceneErrorBoundary>
  );
}
