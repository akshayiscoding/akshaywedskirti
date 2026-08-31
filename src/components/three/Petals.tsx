"use client";

/**
 * Falling petals — up to nine hundred of them.
 *
 * This is the only system in the diorama big enough that the frame loop's shape
 * matters. Three rules:
 *
 *  1. Parameters live in `Float32Array`s, not an array of objects. Nine hundred
 *     small objects is nine hundred pointer chases per frame.
 *  2. Nothing is allocated inside `useFrame` — every maths object is memoised.
 *  3. The fall is a closed form of `t`, so it can't drift, and a tab left in the
 *     background doesn't come back to a wall of petals piled at the floor.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Euler, type InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";

import { PETAL_BOUNDS } from "@/lib/layout";
import { scroll, damp } from "@/lib/scroll";
import { useMotionEnabled, useQualityPreset } from "@/lib/store";
import { PALETTE, rand, randRange, sheet } from "./paper";
import { bladeGeometry, useDisposeBag } from "./geo";

const TINTS = [
  new Color(PALETTE.ivory),
  new Color(PALETTE.blush),
  new Color(PALETTE.rose),
  new Color(PALETTE.paper),
  new Color(PALETTE.roseDeep),
  new Color(PALETTE.goldPale),
];

const RANGE = PETAL_BOUNDS.yMax - PETAL_BOUNDS.yMin;

/** Fractional part, always positive. */
function fract(x: number) {
  return x - Math.floor(x);
}

export function Petals() {
  const preset = useQualityPreset();
  const motion = useMotionEnabled();
  const count = preset.petals;

  const geometry = useMemo(() => bladeGeometry(0.14, 0.19, 0.42, 0.35), []);
  useDisposeBag(useMemo(() => ({ geometry }), [geometry]));

  /**
   * One flat buffer per parameter.
   *
   * `phase` is where in its fall the petal starts, `speed` how fast, `swirlR` and
   * `swirlRate` its horizontal spiral, `tumble*` its rotation rates. Depth is
   * baked into `drag` so petals nearer the camera get shoved harder by a scroll.
   */
  const p = useMemo(() => {
    const x = new Float32Array(count);
    const z = new Float32Array(count);
    const phase = new Float32Array(count);
    const speed = new Float32Array(count);
    const swirlR = new Float32Array(count);
    const swirlRate = new Float32Array(count);
    const swirlPhase = new Float32Array(count);
    const tumbleX = new Float32Array(count);
    const tumbleY = new Float32Array(count);
    const tumbleZ = new Float32Array(count);
    const scale = new Float32Array(count);
    const drag = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const s = i * 11.3 + 1;
      x[i] = randRange(s, -PETAL_BOUNDS.x, PETAL_BOUNDS.x);
      z[i] = randRange(s + 1, -PETAL_BOUNDS.z, PETAL_BOUNDS.z);
      phase[i] = rand(s + 2);
      // A wide spread of fall speeds is what stops it reading as a single sheet
      // of confetti moving down the screen.
      speed[i] = randRange(s + 3, 0.42, 1.35);
      swirlR[i] = randRange(s + 4, 0.25, 1.5);
      swirlRate[i] = randRange(s + 5, 0.35, 1.1);
      swirlPhase[i] = randRange(s + 6, 0, Math.PI * 2);
      tumbleX[i] = randRange(s + 7, -1.6, 1.6);
      tumbleY[i] = randRange(s + 8, -1.2, 1.2);
      tumbleZ[i] = randRange(s + 9, -1.9, 1.9);
      scale[i] = randRange(s + 10, 0.6, 1.5);
      drag[i] = randRange(s + 11, 0.4, 1.9);
    }

    return { x, z, phase, speed, swirlR, swirlRate, swirlPhase, tumbleX, tumbleY, tumbleZ, scale, drag };
  }, [count]);

  const ref = useRef<InstancedMesh>(null);
  const scratch = useMemo(
    () => ({ v: new Vector3(), q: new Quaternion(), e: new Euler(), s: new Vector3(), m: new Matrix4() }),
    []
  );
  /** Damped scroll velocity, so a flick shoves the petals and then lets them settle. */
  const gust = useRef(0);

  const write = (t: number, dt: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { v, q, e, s, m } = scratch;

    // Clamped before damping: a trackpad fling can spike velocity high enough to
    // throw every petal out of frame for a second.
    const target = Math.max(-1.6, Math.min(1.6, scroll.velocity * 2.4));
    gust.current = damp(gust.current, target, 3.2, dt);
    const shove = gust.current;

    for (let i = 0; i < count; i++) {
      // Fall, wrapped: 1 at the top of the box, 0 at the bottom.
      const fall = 1 - fract(p.phase[i] + (t * p.speed[i]) / RANGE);
      const y = PETAL_BOUNDS.yMin + fall * RANGE;

      // The spiral tightens as the petal descends, the way a real one does once
      // it's out of the wind.
      const swirl = t * p.swirlRate[i] + p.swirlPhase[i];
      const radius = p.swirlR[i] * (0.35 + 0.65 * fall);

      v.set(
        p.x[i] + Math.cos(swirl) * radius + shove * p.drag[i],
        y,
        p.z[i] + Math.sin(swirl * 0.8) * radius
      );
      e.set(t * p.tumbleX[i] + p.swirlPhase[i], t * p.tumbleY[i], t * p.tumbleZ[i] + swirl * 0.3);
      s.setScalar(p.scale[i]);

      mesh.setMatrixAt(i, m.compose(v, q.setFromEuler(e), s));
    }

    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (mesh) {
      for (let i = 0; i < count; i++) mesh.setColorAt(i, TINTS[i % TINTS.length]);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    // Placed before the first paint. Otherwise the opening frame is a solid block
    // of petals at the origin, right in front of the camera.
    write(0, 1 / 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, count]);

  useFrame(({ clock }, delta) => {
    // With motion off the frameloop is on demand, so this runs only when
    // something invalidates — and t=0 gives the same still arrangement every time.
    write(motion ? clock.elapsedTime : 0, Math.min(delta, 1 / 20));
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, Math.max(1, count)]}
      // Petals fill the whole flight volume and their matrices change every frame,
      // so there's no bounding sphere worth computing.
      frustumCulled={false}
    >
      <meshStandardMaterial {...sheet(PALETTE.ivory, { roughness: 0.82 })} />
    </instancedMesh>
  );
}
