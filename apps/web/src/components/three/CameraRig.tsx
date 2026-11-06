"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { frameFor, type SceneMode } from "./framing";

const BASE_AZIMUTH = Math.PI / 4;
const BASE_ELEVATION = 0.5; // ~29°: an isometric-style three-quarter view
const MAX_USER_AZIMUTH = 1.1;
const MAX_USER_ELEVATION = 0.2;

interface RigState {
  az: number;
  el: number;
  dist: number;
  focusY: number;
  userAz: number;
  userEl: number;
  lastInteraction: number;
}

/** Pointer-drag rotation, clamped to a small arc. Returns a cleanup function. */
function attachDrag(el: HTMLElement, s: RigState): () => void {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const down = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    el.setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    s.userAz = THREE.MathUtils.clamp(s.userAz - (e.clientX - lastX) * 0.008, -MAX_USER_AZIMUTH, MAX_USER_AZIMUTH);
    s.userEl = THREE.MathUtils.clamp(s.userEl + (e.clientY - lastY) * 0.004, -MAX_USER_ELEVATION, MAX_USER_ELEVATION);
    s.lastInteraction = performance.now();
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const up = (e: PointerEvent) => {
    dragging = false;
    el.releasePointerCapture?.(e.pointerId);
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.style.touchAction = "none";
  el.style.cursor = "grab";
  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    el.style.cursor = "";
  };
}

const _target = new THREE.Vector3();

/**
 * Smooth, limited camera. The rig owns the camera; players can drag to rotate a little,
 * and the view eases back to the default angle after a few idle seconds.
 */
export function CameraRig({ mode, floors, reducedMotion, interactive }: {
  mode: SceneMode;
  floors: number;
  reducedMotion: boolean;
  interactive: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const rig = useRef<RigState>({ az: BASE_AZIMUTH + 0.6, el: 0.95, dist: 34, focusY: 6, userAz: 0, userEl: 0, lastInteraction: -Infinity });

  useEffect(() => (interactive ? attachDrag(gl.domElement, rig.current) : undefined), [gl, interactive]);

  useFrame(({ clock, camera, size, scene }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = rig.current;
    const t = clock.elapsedTime;
    const goal = frameFor(mode, floors, size.width / Math.max(1, size.height));

    // Ease user rotation back to centre after 3 s idle.
    if (performance.now() - s.lastInteraction > 3000) {
      const back = 1 - Math.exp(-dt * 1.5);
      s.userAz += (0 - s.userAz) * back;
      s.userEl += (0 - s.userEl) * back;
    }

    let azGoal = BASE_AZIMUTH + s.userAz;
    if (!reducedMotion && (mode === "home" || mode === "results")) {
      azGoal += Math.sin(t * 0.13) * (mode === "results" ? 0.5 : 0.32);
    }
    const elGoal = (mode === "intro" ? 0.9 : BASE_ELEVATION) + s.userEl;

    const k = 1 - Math.exp(-dt * (reducedMotion ? 6 : 2.2));
    s.az += (azGoal - s.az) * k;
    s.el += (elGoal - s.el) * k;
    s.dist += (goal.distance - s.dist) * k;
    s.focusY += (goal.focusY - s.focusY) * k;

    const horiz = Math.cos(s.el) * s.dist;
    camera.position.set(Math.sin(s.az) * horiz, s.focusY + Math.sin(s.el) * s.dist, Math.cos(s.az) * horiz);
    camera.lookAt(_target.set(0, s.focusY, 0));
    // Keep fog behind the tower however far the camera pulls back for tall towers.
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = s.dist + 14;
      scene.fog.far = s.dist + 60;
    }
  });

  return null;
}
