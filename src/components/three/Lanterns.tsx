"use client";

/**
 * Paper lanterns drifting over the meadow.
 *
 * The count comes from the quality tier, and every lantern's motion is a closed
 * form of `t` — no integration, no per-frame state to drift out of sync, and the
 * arrangement is identical on every reload, which matters when you're tuning
 * camera waypoints against it.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  CylinderGeometry,
  Euler,
  type InstancedMesh,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";

import { LANTERN_BOUNDS } from "@/lib/layout";
import { useMotionEnabled, useQualityPreset } from "@/lib/store";
import { PALETTE, emissive, rand, randRange, sheet } from "./paper";
import { mergeGeom, useDisposeBag } from "./geo";

const SHELL_TINTS = [
  new Color(PALETTE.ivory),
  new Color(PALETTE.blush),
  new Color(PALETTE.paper),
  new Color(PALETTE.goldPale),
];

type Lantern = {
  base: Vector3;
  /** Drift amplitude per axis. */
  amp: Vector3;
  /** Angular rate per axis. */
  rate: Vector3;
  phase: Vector3;
  scale: number;
  spin: number;
  tilt: number;
};

export function Lanterns() {
  const preset = useQualityPreset();
  const motion = useMotionEnabled();

  const bag = useMemo(
    () => ({
      // A squat paper globe: two truncated cones back to back, with card rims. The
      // silhouette is what says "lantern", so it's worth the extra rim.
      shell: mergeGeom([
        { geo: new SphereGeometry(0.34, 10, 7), scale: [1, 0.82, 1] },
        { geo: new CylinderGeometry(0.13, 0.13, 0.03, 10), position: [0, 0.27, 0] },
        { geo: new CylinderGeometry(0.11, 0.11, 0.03, 10), position: [0, -0.27, 0] },
      ]),
      core: new SphereGeometry(0.2, 8, 6),
    }),
    []
  );

  useDisposeBag(bag);

  const lanterns = useMemo<Lantern[]>(() => {
    const n = preset.lanterns;
    return Array.from({ length: n }, (_, i) => {
      const seed = i * 19.7 + 3;
      // Polar placement, biased outward, so the middle of the sky above the aisle
      // stays clear — the camera looks straight up through it at the vows.
      const a = rand(seed) * Math.PI * 2;
      const r = 0.35 + rand(seed + 1) ** 0.6 * 0.65;

      return {
        base: new Vector3(
          Math.cos(a) * r * LANTERN_BOUNDS.x,
          randRange(seed + 2, LANTERN_BOUNDS.yMin, LANTERN_BOUNDS.yMax),
          Math.sin(a) * r * LANTERN_BOUNDS.z
        ),
        amp: new Vector3(randRange(seed + 3, 0.6, 2.2), randRange(seed + 4, 0.3, 1.1), randRange(seed + 5, 0.6, 2.2)),
        rate: new Vector3(randRange(seed + 6, 0.08, 0.2), randRange(seed + 7, 0.13, 0.31), randRange(seed + 8, 0.07, 0.19)),
        phase: new Vector3(
          randRange(seed + 9, 0, Math.PI * 2),
          randRange(seed + 10, 0, Math.PI * 2),
          randRange(seed + 11, 0, Math.PI * 2)
        ),
        scale: randRange(seed + 12, 0.72, 1.5),
        spin: randRange(seed + 13, -0.12, 0.12),
        tilt: randRange(seed + 14, -0.14, 0.14),
      };
    });
  }, [preset.lanterns]);

  const shellRef = useRef<InstancedMesh>(null);
  const coreRef = useRef<InstancedMesh>(null);

  // Scratch. Allocating inside the frame loop would hand the GC a few hundred
  // objects a second for no reason.
  const scratch = useMemo(
    () => ({ p: new Vector3(), q: new Quaternion(), e: new Euler(), s: new Vector3(), m: new Matrix4() }),
    []
  );

  const write = (t: number) => {
    const shell = shellRef.current;
    const core = coreRef.current;
    if (!shell || !core) return;
    const { p, q, e, s, m } = scratch;

    for (let i = 0; i < lanterns.length; i++) {
      const l = lanterns[i];
      p.set(
        l.base.x + Math.sin(t * l.rate.x + l.phase.x) * l.amp.x,
        l.base.y + Math.sin(t * l.rate.y + l.phase.y) * l.amp.y,
        l.base.z + Math.cos(t * l.rate.z + l.phase.z) * l.amp.z
      );
      // A lantern hanging in still air pendulums slightly as it drifts; the tilt
      // leads the horizontal motion, which is what makes it look weightless.
      e.set(Math.sin(t * l.rate.x + l.phase.x) * l.tilt, t * l.spin + l.phase.y, Math.cos(t * l.rate.z + l.phase.z) * l.tilt);
      s.setScalar(l.scale);
      m.compose(p, q.setFromEuler(e), s);

      shell.setMatrixAt(i, m);
      core.setMatrixAt(i, m);
    }

    shell.instanceMatrix.needsUpdate = true;
    core.instanceMatrix.needsUpdate = true;
  };

  // Tints once, and an initial placement before the first paint — a `useFrame`
  // alone would show one frame with every lantern stacked at the origin.
  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (shell) {
      for (let i = 0; i < lanterns.length; i++) shell.setColorAt(i, SHELL_TINTS[i % SHELL_TINTS.length]);
      if (shell.instanceColor) shell.instanceColor.needsUpdate = true;
    }
    write(0);
    // `write` closes over refs and the memoised scratch, both stable for a given
    // lantern set, so the lantern list is the only real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanterns]);

  useFrame(({ clock }) => {
    write(motion ? clock.elapsedTime : 0);
  });

  return (
    <>
      <instancedMesh
        ref={shellRef}
        args={[bag.shell, undefined, Math.max(1, lanterns.length)]}
        // The matrices change every frame, so a bounding sphere computed once is a
        // lie — and a stale one pops the whole flight in and out of view.
        frustumCulled={false}
      >
        <meshStandardMaterial {...sheet(PALETTE.ivory, { roughness: 0.95, transparent: true, opacity: 0.9 })} />
      </instancedMesh>

      {/* The lamp inside. Small enough to stay hidden behind the shell's rims but
          bright enough for the bloom pass to find it. */}
      <instancedMesh ref={coreRef} args={[bag.core, undefined, Math.max(1, lanterns.length)]} frustumCulled={false}>
        <meshStandardMaterial {...emissive(PALETTE.glowWarm, 2.2)} />
      </instancedMesh>
    </>
  );
}
