"use client";

/**
 * The olive grove. Three tree silhouettes, instanced across the hand-placed
 * positions in the layout, plus tufts of dry grass to break up the meadow.
 */

import { useMemo } from "react";
import { ConeGeometry, CylinderGeometry, Color, Euler, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from "three";

import { TREES } from "@/lib/layout";
import { useQualityPreset } from "@/lib/store";
import { PALETTE, foliage, paper, rand, randRange } from "./paper";
import { bladeGeometry, mergeGeom, useDisposeBag } from "./geo";
import { Instanced } from "./Instanced";

/**
 * Trunk and canopy are built as separate geometries per silhouette rather than
 * merged, because they need different materials — bark and leaf. Six draw calls
 * for the whole grove either way.
 */
function treeKinds() {
  return [
    /* 0 — olive: short, broad, three loose clumps on a leaning trunk. */
    {
      trunk: mergeGeom([
        { geo: new CylinderGeometry(0.1, 0.19, 1.6, 6), position: [0, 0.8, 0], rotation: [0.05, 0, 0.07] },
        { geo: new CylinderGeometry(0.05, 0.09, 0.7, 5), position: [0.22, 1.75, 0.06], rotation: [0, 0, -0.5] },
        { geo: new CylinderGeometry(0.045, 0.08, 0.6, 5), position: [-0.2, 1.7, -0.05], rotation: [0, 0, 0.55] },
      ]),
      canopy: mergeGeom([
        { geo: new IcosahedronGeometry(0.86, 0), position: [0.05, 2.15, 0], scale: [1, 0.68, 0.95] },
        { geo: new IcosahedronGeometry(0.62, 0), position: [0.58, 1.98, 0.16], scale: [1, 0.7, 1] },
        { geo: new IcosahedronGeometry(0.55, 0), position: [-0.5, 2.02, -0.14], scale: [1, 0.72, 1] },
        { geo: new IcosahedronGeometry(0.48, 0), position: [0.02, 2.72, 0.05], scale: [1, 0.66, 1] },
      ]),
    },

    /* 1 — cypress: a tall dark exclamation mark. Every grove needs verticals. */
    {
      trunk: mergeGeom([{ geo: new CylinderGeometry(0.09, 0.15, 0.7, 6), position: [0, 0.35, 0] }]),
      canopy: mergeGeom([
        { geo: new ConeGeometry(0.62, 3.0, 7), position: [0, 2.1, 0] },
        { geo: new ConeGeometry(0.42, 1.2, 7), position: [0.03, 3.35, 0] },
      ]),
    },

    /* 2 — broad shade tree: two wide flat discs of leaf on a straight trunk. */
    {
      trunk: mergeGeom([
        { geo: new CylinderGeometry(0.12, 0.24, 1.35, 6), position: [0, 0.68, 0] },
        { geo: new CylinderGeometry(0.06, 0.1, 0.8, 5), position: [-0.28, 1.5, 0.1], rotation: [0, 0, 0.6] },
      ]),
      canopy: mergeGeom([
        { geo: new IcosahedronGeometry(1.28, 0), position: [0, 1.98, 0], scale: [1, 0.46, 1] },
        { geo: new IcosahedronGeometry(0.94, 0), position: [0.12, 2.44, -0.06], scale: [1, 0.5, 1] },
      ]),
    },
  ];
}

const LEAF_TINTS = [
  new Color(PALETTE.leafLight),
  new Color(PALETTE.leaf),
  new Color(PALETTE.leafDark),
  new Color(PALETTE.leaf),
];

export function Trees() {
  const preset = useQualityPreset();
  const kinds = useMemo(treeKinds, []);

  useDisposeBag(useMemo(() => ({ kinds: kinds.flatMap((k) => [k.trunk, k.canopy]) }), [kinds]));

  /**
   * Transforms per silhouette.
   *
   * At lower quality tiers we thin the grove rather than truncating it — taking
   * the first N of a hand-ordered list would strip one whole side of the scene
   * and leave the camera flying past bare ground.
   */
  const perKind = useMemo(() => {
    const count = Math.min(preset.trees, TREES.length);
    const stride = TREES.length / count;

    const buckets: Matrix4[][] = [[], [], []];
    const p = new Vector3();
    const e = new Euler();
    const q = new Quaternion();
    const s = new Vector3();

    for (let i = 0; i < count; i++) {
      const tree = TREES[Math.min(TREES.length - 1, Math.floor(i * stride))];
      const seed = tree.x * 13.1 + tree.z * 7.3;

      p.set(tree.x, 0, tree.z);
      // Yaw only — a leaning canopy is baked into the silhouette, and tilting the
      // whole tree would lift the trunk out of the ground.
      e.set(0, randRange(seed, 0, Math.PI * 2), 0);
      // Slightly wider than tall, or slightly taller than wide. Uniform scale
      // makes 26 copies of one tree obvious.
      s.set(tree.s * randRange(seed + 1, 0.9, 1.12), tree.s * randRange(seed + 2, 0.92, 1.14), tree.s * randRange(seed + 3, 0.9, 1.12));

      buckets[tree.k].push(new Matrix4().compose(p, q.setFromEuler(e), s));
    }

    return buckets;
  }, [preset.trees]);

  return (
    <>
      {kinds.map((kind, k) =>
        perKind[k].length === 0 ? null : (
          <group key={k}>
            <Instanced geometry={kind.trunk} matrices={perKind[k]} castShadow receiveShadow>
              <meshStandardMaterial {...paper(PALETTE.trunk, { roughness: 0.95 })} />
            </Instanced>
            <Instanced geometry={kind.canopy} matrices={perKind[k]} tints={LEAF_TINTS} castShadow receiveShadow>
              <meshStandardMaterial {...foliage(k === 1 ? PALETTE.leafDark : PALETTE.leaf)} />
            </Instanced>
          </group>
        )
      )}

      <Tufts count={Math.round(preset.trees * 7)} />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Grass
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Tufts of dry grass. Cheap, and they do a disproportionate amount of work —
 * without them the meadow is an obviously flat plane wherever the camera gets
 * close to it.
 */
function Tufts({ count }: { count: number }) {
  const geometry = useMemo(
    () =>
      mergeGeom(
        // Five blades fanning from a point.
        Array.from({ length: 5 }, (_, i) => ({
          geo: bladeGeometry(0.05, 0.42, 0.5, 0),
          position: [randRange(i * 3.1, -0.05, 0.05), 0.19, randRange(i * 5.9, -0.05, 0.05)] as const,
          rotation: [randRange(i * 7.7, -0.35, 0.35), (i / 5) * Math.PI * 2, randRange(i * 9.3, -0.4, 0.4)] as const,
        }))
      ),
    []
  );

  useDisposeBag({ geometry });

  const matrices = useMemo(() => {
    const p = new Vector3();
    const e = new Euler();
    const q = new Quaternion();
    const s = new Vector3();
    const out: Matrix4[] = [];

    for (let i = 0; i < count; i++) {
      const seed = i * 17.3 + 2;
      // Polar placement in a ring, so nothing lands on the ceremony floor.
      const a = rand(seed) * Math.PI * 2;
      const r = 5 + rand(seed + 1) ** 0.7 * 30;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      // Keep the aisle corridor and the reception floor clear.
      if (Math.abs(x) < 2.4 && z > -16 && z < 9) continue;
      if (x > 7.5 && x < 14 && z > -3 && z < 10) continue;

      p.set(x, 0, z);
      e.set(0, rand(seed + 2) * Math.PI * 2, 0);
      s.setScalar(randRange(seed + 3, 0.7, 1.5));
      out.push(new Matrix4().compose(p, q.setFromEuler(e), s));
    }

    return out;
  }, [count]);

  return (
    <Instanced geometry={geometry} matrices={matrices} tints={LEAF_TINTS}>
      <meshStandardMaterial {...foliage(PALETTE.grassDry, { roughness: 0.92 })} />
    </Instanced>
  );
}
