"use client";

/**
 * A static instanced mesh with optional per-instance colour.
 *
 * Used anywhere an arrangement is computed once and never animated — which is
 * most of the diorama: chairs, trees, tableware, florals, fallen petals. Anything
 * that *does* move per frame writes its own matrices in a `useFrame` instead.
 */

import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { BufferGeometry, Color, InstancedMesh, Matrix4 } from "three";

export function Instanced({
  geometry,
  matrices,
  tints,
  castShadow = false,
  receiveShadow = false,
  children,
}: {
  geometry: BufferGeometry;
  matrices: Matrix4[];
  /** Cycled over the instances. Omit for a single flat colour. */
  tints?: Color[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<InstancedMesh>(null);

  // A layout effect, not an effect: matrices must be in the buffer before the
  // first paint, or one frame renders with every instance collapsed at the origin.
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      if (tints?.length) mesh.setColorAt(i, tints[i % tints.length]);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // The default bounding sphere only covers the source geometry, so without
    // this the whole cloud is frustum-culled the moment the origin leaves view.
    mesh.computeBoundingSphere();
  }, [matrices, tints]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, Math.max(1, matrices.length)]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {children}
    </instancedMesh>
  );
}
