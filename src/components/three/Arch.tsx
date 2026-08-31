"use client";

/**
 * The ceremony arch and the dais it stands on — the one object in the diorama the
 * camera keeps coming back to, so it carries the most detail.
 */

import { useMemo } from "react";
import {
  Color,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  TorusGeometry,
  Vector3,
} from "three";

import { ARCH, PLATFORM } from "@/lib/layout";
import { PALETTE, foliage, gilt, paper, rand, randRange } from "./paper";
import { bladeGeometry, mergeGeom, useDisposeBag } from "./geo";
import { Instanced } from "./Instanced";

const R = ARCH.radius;
const L = ARCH.legHeight;
const TUBE = ARCH.tube;

/** Arc-length fractions of the three pieces: leg up, half circle, leg down. */
const TOTAL_LEN = 2 * L + Math.PI * R;
const F_LEG = L / TOTAL_LEN;

type PathPoint = { x: number; y: number; angle: number; nx: number; ny: number };

/**
 * Walk the arch from the foot of the left leg (t=0) to the foot of the right leg
 * (t=1), returning the point, the direction of travel, and the outward normal.
 *
 * Everything decorative is placed against this — gold banding, florals, greenery
 * — so nothing is positioned by hand and the whole arch rescales from `ARCH` in
 * the layout file.
 */
function archPoint(t: number): PathPoint {
  if (t < F_LEG) {
    // Left leg, travelling up.
    return { x: -R, y: (t / F_LEG) * L, angle: Math.PI / 2, nx: -1, ny: 0 };
  }
  if (t > 1 - F_LEG) {
    // Right leg, travelling down.
    return { x: R, y: ((1 - t) / F_LEG) * L, angle: -Math.PI / 2, nx: 1, ny: 0 };
  }
  // The half circle, sweeping from θ=π (left) round to θ=0 (right).
  const theta = Math.PI * (1 - (t - F_LEG) / (1 - 2 * F_LEG));
  return {
    x: Math.cos(theta) * R,
    y: L + Math.sin(theta) * R,
    // Direction of travel, which stays continuous with both legs.
    angle: Math.atan2(-Math.cos(theta), Math.sin(theta)),
    nx: Math.cos(theta),
    ny: Math.sin(theta),
  };
}

/**
 * Where the flowers go.
 *
 * Real arch florals are never symmetrical — a florist builds one heavy shoulder
 * and one light trailing foot, because a symmetrical arch photographs like a
 * fast-food sign. Weighted sampling gives us that: a dense mass through the upper
 * left and over the crown, a thinner run down the right, and a small cluster at
 * the right foot.
 */
function floralWeight(t: number) {
  const peak = (centre: number, width: number) => Math.exp(-(((t - centre) / width) ** 2));
  return 0.06 + 1.0 * peak(0.36, 0.16) + 0.55 * peak(0.55, 0.13) + 0.34 * peak(0.94, 0.06);
}

/** Inverse-CDF sampler over `floralWeight`, so density follows the curve. */
function buildSampler(buckets = 128) {
  const cdf = new Float32Array(buckets + 1);
  for (let i = 0; i < buckets; i++) cdf[i + 1] = cdf[i] + floralWeight((i + 0.5) / buckets);
  const total = cdf[buckets];

  return (u: number) => {
    const target = u * total;
    let lo = 0;
    let hi = buckets - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid + 1] < target) lo = mid + 1;
      else hi = mid;
    }
    return (lo + 0.5) / buckets;
  };
}

const BLOOM_TINTS = [PALETTE.ivory, PALETTE.blush, PALETTE.rose, PALETTE.roseDeep, PALETTE.paper];

const FOLIAGE_TINTS = [
  new Color(PALETTE.leafLight),
  new Color(PALETTE.leaf),
  new Color(PALETTE.leafDark),
];

/* ────────────────────────────────────────────────────────────────────────────
   Arch
   ──────────────────────────────────────────────────────────────────────────── */

export function Arch() {
  const bag = useMemo(() => {
    // Frame: two legs and the crown, merged into one draw call. Six radial
    // segments rather than a smooth 24 — a hexagonal cross-section catches the
    // low sun in flat bands and reads as rolled card, not a plastic pipe.
    const frame = mergeGeom([
      { geo: new CylinderGeometry(TUBE, TUBE * 1.15, L, 6), position: [-R, L / 2, 0] },
      { geo: new CylinderGeometry(TUBE, TUBE * 1.15, L, 6), position: [R, L / 2, 0] },
      { geo: new TorusGeometry(R, TUBE, 6, 48, Math.PI), position: [0, L, 0] },
      // A slightly wider collar where each leg meets the dais.
      { geo: new CylinderGeometry(TUBE * 1.9, TUBE * 2.2, 0.16, 6), position: [-R, 0.08, 0] },
      { geo: new CylinderGeometry(TUBE * 1.9, TUBE * 2.2, 0.16, 6), position: [R, 0.08, 0] },
    ]);

    // Gold banding at five points along the sweep. Each band is a short, wider
    // cylinder rotated so its axis follows the arch's own direction of travel.
    const bands = mergeGeom(
      [0.08, 0.3, 0.5, 0.7, 0.92].map((t) => {
        const p = archPoint(t);
        return {
          geo: new CylinderGeometry(TUBE * 1.24, TUBE * 1.24, 0.11, 6),
          position: [p.x, p.y, 0] as const,
          // A +Y cylinder, turned to lie along a direction `angle` from +X.
          rotation: [0, 0, p.angle - Math.PI / 2] as const,
        };
      })
    );

    return {
      frame,
      bands,
      bloom: new IcosahedronGeometry(0.115, 0),
      leaf: bladeGeometry(0.1, 0.32, 0.3),
    };
  }, []);

  useDisposeBag(bag);

  /**
   * One pass builds the blooms and the greenery together. They have to be
   * sampled from the same distribution — greenery is what fills the space
   * *between* flowers, so drawing them independently leaves leaves floating in
   * gaps where no arrangement exists.
   */
  const arrangement = useMemo(() => {
    const sample = buildSampler();
    const p = new Vector3();
    const s = new Vector3();
    const e = new Euler();
    const q = new Quaternion();

    const place = (seed: number, spread: number, min: number, max: number, alignToFrame: boolean) => {
      const pt = archPoint(sample(rand(seed)));
      // Push out along the arch's normal, then jitter in all three axes. The
      // depth jitter is what stops the arrangement reading as a printed decal.
      const out = randRange(seed * 1.7 + 11, 0.04, spread);
      p.set(
        pt.x + pt.nx * out + randRange(seed * 2.3 + 3, -spread, spread) * 0.55,
        pt.y + pt.ny * out + randRange(seed * 3.1 + 7, -spread, spread) * 0.55,
        randRange(seed * 4.9 + 5, -spread * 1.5, spread * 1.5)
      );
      e.set(
        randRange(seed * 5.3, 0, Math.PI * 2),
        randRange(seed * 6.7, 0, Math.PI * 2),
        // Leaves fan out along the frame; blooms face any which way.
        alignToFrame ? pt.angle + randRange(seed * 7.1, -1.1, 1.1) : randRange(seed * 7.1, 0, Math.PI * 2)
      );
      s.setScalar(randRange(seed * 8.9, min, max));
      return new Matrix4().compose(p, q.setFromEuler(e), s);
    };

    return {
      blooms: Array.from({ length: 118 }, (_, i) => place(i * 13.7 + 1, 0.3, 0.55, 1.5, false)),
      bloomTints: Array.from(
        { length: 118 },
        (_, i) => new Color(BLOOM_TINTS[Math.floor(rand(i * 21.3) * BLOOM_TINTS.length) % BLOOM_TINTS.length])
      ),
      leaves: Array.from({ length: 210 }, (_, i) => place(i * 9.4 + 500, 0.42, 0.7, 1.55, true)),
    };
  }, []);

  return (
    <group
      position={[ARCH.position[0], ARCH.position[1] + PLATFORM.height, ARCH.position[2]]}
      rotation={[0, ARCH.rotationY, 0]}
    >
      <mesh geometry={bag.frame} castShadow receiveShadow>
        <meshStandardMaterial {...paper(PALETTE.paperShade, { roughness: 0.8 })} />
      </mesh>

      <mesh geometry={bag.bands} castShadow>
        <meshStandardMaterial {...gilt()} />
      </mesh>

      {/* Greenery first, so the blooms read as sitting in front of it. */}
      <Instanced geometry={bag.leaf} matrices={arrangement.leaves} tints={FOLIAGE_TINTS} castShadow>
        <meshStandardMaterial {...foliage()} />
      </Instanced>

      <Instanced geometry={bag.bloom} matrices={arrangement.blooms} tints={arrangement.bloomTints} castShadow>
        <meshStandardMaterial {...paper(PALETTE.ivory, { roughness: 0.82 })} />
      </Instanced>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Dais
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * The low stone platform. Three stacked discs of decreasing radius plus a step on
 * the aisle side — the stack is what makes it read as cut card rather than a
 * turned cylinder.
 */
export function Dais() {
  const geometry = useMemo(() => {
    const h = PLATFORM.height;
    const r = PLATFORM.radius;
    return mergeGeom([
      { geo: new CylinderGeometry(r + 0.34, r + 0.4, h * 0.45, 20), position: [0, h * 0.22, 0] },
      { geo: new CylinderGeometry(r, r + 0.08, h * 0.6, 20), position: [0, h * 0.62, 0] },
      { geo: new CylinderGeometry(r - 0.5, r - 0.42, h * 0.3, 20), position: [0, h * 1.02, 0] },
      // A half-disc step on the aisle side, so it's obvious how you get up there.
      // The half runs 0→π, which is the +X side; −90° about Y swings it to +Z.
      {
        geo: new CylinderGeometry(1.9, 2.0, h * 0.5, 16, 1, false, 0, Math.PI),
        position: [0, h * 0.25, r + 0.1],
        rotation: [0, -Math.PI / 2, 0],
      },
    ]);
  }, []);

  useDisposeBag({ geometry });

  return (
    <mesh
      geometry={geometry}
      position={[PLATFORM.position[0], PLATFORM.position[1], PLATFORM.position[2]]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial {...paper(PALETTE.stone, { roughness: 0.95 })} />
    </mesh>
  );
}
