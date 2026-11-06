"use client";
import { useEffect, useMemo } from "react";
import { mergeParts, disposeMerged, type Part } from "./parts";

/** Renders a parts list as a few merged meshes. `buildKey` must change when parts change. */
export function Merged({ buildKey, build, castShadow = true, receiveShadow = true }: {
  buildKey: string;
  build: () => Part[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const meshes = useMemo(() => mergeParts(build()), [buildKey]);
  useEffect(() => () => disposeMerged(meshes), [meshes]);
  return (
    <>
      {meshes.map((m) => (
        <mesh key={m.key} geometry={m.geometry} material={m.material} castShadow={castShadow} receiveShadow={receiveShadow} />
      ))}
    </>
  );
}
