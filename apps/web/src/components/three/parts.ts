/**
 * Low-poly "part" system.
 *
 * Builders describe models as lists of primitive parts (box, prism, cone…) with a colour
 * and transform. `mergeParts` bakes each colour into ONE BufferGeometry, so a whole tower
 * floor renders in ~4–6 draw calls instead of ~30, and an island in a handful.
 * Unit geometries and materials are cached and shared across the whole app.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Prim = "box" | "prism8" | "prism6" | "disc16" | "cone8" | "cone6" | "ico" | "dodeca" | "torus8" | "halfDisc";

export interface Part {
  prim: Prim;
  color: string;
  /** Emissive parts get a separate glowing material (lit windows). */
  glow?: boolean;
  pos: readonly [number, number, number];
  rot?: readonly [number, number, number];
  scale: readonly [number, number, number];
}

const unitGeometries = new Map<Prim, THREE.BufferGeometry>();

function makeUnit(prim: Prim): THREE.BufferGeometry {
  let g: THREE.BufferGeometry;
  switch (prim) {
    case "box": g = new THREE.BoxGeometry(1, 1, 1); break;
    // Prisms/cones span y ∈ [0, 1] so parts can be placed by their base.
    case "prism8": g = new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0); break;
    case "prism6": g = new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0); break;
    case "disc16": g = new THREE.CylinderGeometry(1, 1, 1, 16).translate(0, 0.5, 0); break;
    case "cone8": g = new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0); break;
    case "cone6": g = new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0); break;
    case "ico": g = new THREE.IcosahedronGeometry(1, 0); break;
    case "dodeca": g = new THREE.DodecahedronGeometry(1, 0); break;
    case "torus8": g = new THREE.TorusGeometry(1, 0.08, 4, 16).rotateX(Math.PI / 2); break;
    // Half disc in the XY plane (for window arches), thickness along z.
    case "halfDisc": g = new THREE.CylinderGeometry(1, 1, 1, 8, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2); break;
  }
  // Merging needs uniform attributes: drop uvs/indices (flat-shaded, untextured).
  const ni = g.index ? g.toNonIndexed() : g;
  ni.deleteAttribute("uv");
  ni.computeVertexNormals();
  return ni;
}

export function unit(prim: Prim): THREE.BufferGeometry {
  let g = unitGeometries.get(prim);
  if (!g) {
    g = makeUnit(prim);
    unitGeometries.set(prim, g);
  }
  return g;
}

const materials = new Map<string, THREE.MeshStandardMaterial>();

export function material(color: string, glow = false): THREE.MeshStandardMaterial {
  const key = `${color}|${glow ? 1 : 0}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: 0.85,
      metalness: 0,
      emissive: glow ? new THREE.Color(color) : new THREE.Color(0x000000),
      emissiveIntensity: glow ? 0.55 : 0,
    });
    materials.set(key, m);
  }
  return m;
}

export interface MergedMesh {
  key: string;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export function mergeParts(parts: readonly Part[]): MergedMesh[] {
  const byMat = new Map<string, { color: string; glow: boolean; geos: THREE.BufferGeometry[] }>();
  for (const part of parts) {
    const key = `${part.color}|${part.glow ? 1 : 0}`;
    let bucket = byMat.get(key);
    if (!bucket) {
      bucket = { color: part.color, glow: !!part.glow, geos: [] };
      byMat.set(key, bucket);
    }
    const g = unit(part.prim).clone();
    _e.set(part.rot?.[0] ?? 0, part.rot?.[1] ?? 0, part.rot?.[2] ?? 0);
    _q.setFromEuler(_e);
    _p.set(...part.pos);
    _s.set(...part.scale);
    g.applyMatrix4(_m.compose(_p, _q, _s));
    bucket.geos.push(g);
  }
  const out: MergedMesh[] = [];
  for (const [key, bucket] of byMat) {
    const geometry = mergeGeometries(bucket.geos, false);
    bucket.geos.forEach((g) => g.dispose());
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    out.push({ key, geometry, material: material(bucket.color, bucket.glow) });
  }
  return out;
}

export function disposeMerged(meshes: readonly MergedMesh[]): void {
  meshes.forEach((m) => m.geometry.dispose());
}
