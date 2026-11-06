"use client";
/**
 * Pooled, instanced particles: one InstancedMesh per effect type, fixed capacity, so
 * bursts never allocate during gameplay and particle counts stay bounded on phones.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx, type FxEvent } from "./fx";

interface Particle {
  life: number;
  maxLife: number;
  p: THREE.Vector3;
  v: THREE.Vector3;
  spin: THREE.Vector3;
  rot: THREE.Euler;
  size: number;
}

const CONFETTI_COLORS = ["#ff5d73", "#ffc145", "#3ec7a6", "#7b6cf6", "#4fb3ff", "#ff8a3d"];
const _obj = new THREE.Object3D();
const _color = new THREE.Color();

interface Pool {
  items: Particle[];
  cursor: number;
}

function createPool(capacity: number): Pool {
  return {
    cursor: 0,
    items: Array.from({ length: capacity }, (): Particle => ({
      life: 0,
      maxLife: 1,
      p: new THREE.Vector3(),
      v: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      rot: new THREE.Euler(),
      size: 1,
    })),
  };
}

function spawn(pool: Pool, init: (p: Particle) => void) {
  const part = pool.items[pool.cursor % pool.items.length] as Particle;
  pool.cursor++;
  init(part);
}

/** Simulation state lives in a ref (mutable by design, never rendered). */
interface Sim {
  dust: Pool;
  conf: Pool;
}

export function Particles({ density = 1 }: { density?: number }) {
  const dustRef = useRef<THREE.InstancedMesh>(null);
  const confRef = useRef<THREE.InstancedMesh>(null);
  const DUST = Math.round(48 * density);
  const CONF = Math.round(140 * density);
  const sim = useRef<Sim | null>(null);
  if (sim.current === null) sim.current = { dust: createPool(DUST), conf: createPool(CONF) };

  const dustGeo = useMemo(() => new THREE.IcosahedronGeometry(0.12, 0), []);
  const confGeo = useMemo(() => new THREE.PlaneGeometry(0.12, 0.2), []);
  const dustMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f3ead8", flatShading: true, roughness: 1 }), []);
  const confMat = useMemo(() => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6 }), []);

  useEffect(() => {
    const mesh = confRef.current;
    if (mesh) {
      for (let i = 0; i < CONF; i++) mesh.setColorAt(i, _color.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length] as string));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    const { dust, conf } = sim.current as Sim;
    const handle = (e: FxEvent) => {
      if (e.kind === "dust") {
        const n = Math.min(DUST, Math.round(18 * density));
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + Math.random() * 0.3;
          spawn(dust, (p) => {
            p.life = p.maxLife = 0.6 + Math.random() * 0.4;
            p.p.set(Math.sin(a) * e.radius, e.y + 0.05, Math.cos(a) * e.radius);
            p.v.set(Math.sin(a) * (1.2 + Math.random()), 0.6 + Math.random() * 0.8, Math.cos(a) * (1.2 + Math.random()));
            p.size = 0.6 + Math.random() * 0.8;
          });
        }
      } else if (e.kind === "confetti" || e.kind === "sparkle") {
        const n = Math.min(CONF, Math.round((e.kind === "confetti" ? e.amount ?? 90 : 24) * density));
        for (let k = 0; k < n; k++) {
          spawn(conf, (p) => {
            p.life = p.maxLife = 1.8 + Math.random() * 1.4;
            const a = Math.random() * Math.PI * 2;
            const sp = e.kind === "confetti" ? 2 + Math.random() * 3 : 1 + Math.random();
            p.p.set(Math.sin(a) * 0.4, e.y, Math.cos(a) * 0.4);
            p.v.set(Math.sin(a) * sp, 3 + Math.random() * 4, Math.cos(a) * sp);
            p.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
            p.size = 0.8 + Math.random() * 0.6;
          });
        }
      }
    };
    return fx.on(handle);
  }, [CONF, DUST, density]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const dust = (sim.current as Sim).dust.items;
    const conf = (sim.current as Sim).conf.items;
    const dm = dustRef.current;
    if (dm) {
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i] as Particle;
        if (p.life > 0) {
          p.life -= dt;
          p.v.multiplyScalar(1 - 2.5 * dt);
          p.v.y -= 1.2 * dt;
          p.p.addScaledVector(p.v, dt);
        }
        const k = Math.max(0, p.life / p.maxLife);
        _obj.position.copy(p.p);
        _obj.rotation.set(0, 0, 0);
        _obj.scale.setScalar(k > 0 ? p.size * (0.4 + k) : 0);
        _obj.updateMatrix();
        dm.setMatrixAt(i, _obj.matrix);
      }
      dm.instanceMatrix.needsUpdate = true;
    }
    const cm = confRef.current;
    if (cm) {
      for (let i = 0; i < conf.length; i++) {
        const p = conf[i] as Particle;
        if (p.life > 0) {
          p.life -= dt;
          p.v.x *= 1 - 1.2 * dt;
          p.v.z *= 1 - 1.2 * dt;
          p.v.y = Math.max(p.v.y - 6 * dt, -1.6); // flutter: low terminal velocity
          p.p.addScaledVector(p.v, dt);
          p.rot.x += p.spin.x * dt;
          p.rot.y += p.spin.y * dt;
          p.rot.z += p.spin.z * dt;
        }
        const k = Math.min(1, Math.max(0, p.life / 0.5));
        _obj.position.copy(p.p);
        _obj.rotation.copy(p.rot);
        _obj.scale.setScalar(p.life > 0 ? p.size * k : 0);
        _obj.updateMatrix();
        cm.setMatrixAt(i, _obj.matrix);
      }
      cm.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={dustRef} args={[dustGeo, dustMat, DUST]} frustumCulled={false} />
      <instancedMesh ref={confRef} args={[confGeo, confMat, CONF]} frustumCulled={false} />
    </>
  );
}
