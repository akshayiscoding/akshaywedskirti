"use client";

/**
 * Two built objects away from the ceremony: the drinks gazebo off to the left,
 * and the signpost that marks the top of the path.
 */

import { useMemo } from "react";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";

import { GAZEBO, SIGNPOST } from "@/lib/layout";
import { PALETTE, emissive, foliage, gilt, paper, randRange, sheet } from "./paper";
import { bladeGeometry, mergeGeom, useDisposeBag } from "./geo";
import { Instanced } from "./Instanced";

const LEAF_TINTS = [new Color(PALETTE.leafLight), new Color(PALETTE.leaf), new Color(PALETTE.leafDark)];
const BLOOM_TINTS = [new Color(PALETTE.ivory), new Color(PALETTE.blush), new Color(PALETTE.rose)];

/* ────────────────────────────────────────────────────────────────────────────
   Gazebo
   ──────────────────────────────────────────────────────────────────────────── */

const POST_R = GAZEBO.radius - 0.3;
/** Half-step offset, so a *gap* rather than a post faces +X — that's the way in. */
const POST_ANGLES = Array.from({ length: GAZEBO.posts }, (_, i) => ((i + 0.5) * Math.PI * 2) / GAZEBO.posts);

export function Gazebo() {
  const bag = useMemo(() => {
    const h = GAZEBO.height;

    const frame = mergeGeom([
      // Hexagonal deck, two stacked plates.
      { geo: new CylinderGeometry(GAZEBO.radius, GAZEBO.radius + 0.1, 0.1, GAZEBO.posts), position: [0, 0.05, 0] },
      { geo: new CylinderGeometry(GAZEBO.radius - 0.12, GAZEBO.radius - 0.06, 0.07, GAZEBO.posts), position: [0, 0.13, 0] },

      ...POST_ANGLES.map((a) => ({
        geo: new CylinderGeometry(0.075, 0.095, h, 6),
        position: [Math.cos(a) * POST_R, h / 2 + 0.16, Math.sin(a) * POST_R] as const,
      })),

      // Ring beam. Four radial segments makes a box beam, not a pipe.
      {
        geo: new TorusGeometry(POST_R, 0.07, 4, GAZEBO.posts),
        position: [0, h + 0.16, 0],
        rotation: [-Math.PI / 2, 0, 0],
      },
    ]);

    const roof = mergeGeom([
      { geo: new ConeGeometry(GAZEBO.radius + 0.42, 1.25, GAZEBO.posts), position: [0, 0.62, 0] },
      { geo: new ConeGeometry(GAZEBO.radius * 0.55, 0.5, GAZEBO.posts), position: [0, 1.42, 0] },
      { geo: new SphereGeometry(0.13, 8, 6), position: [0, 1.72, 0] },
    ]);

    // A drape spanning one bay, bowed so it billows outward.
    const chord = 2 * POST_R * Math.sin(Math.PI / GAZEBO.posts);
    const drape = bladeGeometry(chord * 0.94, h * 0.7, -0.1, 0);

    return { frame, roof, drape, bloom: new IcosahedronGeometry(0.1, 0), leaf: bladeGeometry(0.09, 0.28, 0.32) };
  }, []);

  useDisposeBag(bag);

  /** Greenery swagged along the ring beam, sagging deepest between the posts. */
  const swag = useMemo(() => {
    const p = new Vector3();
    const e = new Euler();
    const q = new Quaternion();
    const s = new Vector3();
    const h = GAZEBO.height;

    const build = (n: number, seedBase: number, drop: number) =>
      Array.from({ length: n }, (_, i) => {
        const seed = seedBase + i * 6.1;
        const a = (i / n) * Math.PI * 2;
        const sag = Math.abs(Math.sin(a * GAZEBO.posts * 0.5)) * drop;
        const r = POST_R + randRange(seed, -0.14, 0.14);
        p.set(Math.cos(a) * r, h + 0.16 - sag - randRange(seed + 1, 0, 0.2), Math.sin(a) * r);
        e.set(randRange(seed + 2, 0, Math.PI * 2), a, randRange(seed + 3, 0, Math.PI * 2));
        s.setScalar(randRange(seed + 4, 0.7, 1.4));
        return new Matrix4().compose(p, q.setFromEuler(e), s);
      });

    return { leaves: build(96, 3, 0.42), blooms: build(34, 500, 0.36) };
  }, []);

  const h = GAZEBO.height;

  return (
    <group position={[GAZEBO.position[0], GAZEBO.position[1], GAZEBO.position[2]]}>
      <mesh geometry={bag.frame} castShadow receiveShadow>
        <meshStandardMaterial {...paper(PALETTE.paper, { roughness: 0.87 })} />
      </mesh>

      <mesh geometry={bag.roof} position={[0, h + 0.16, 0]} castShadow>
        <meshStandardMaterial {...paper(PALETTE.paperShade, { roughness: 0.9 })} />
      </mesh>

      {/* Drapes on four of the six bays: the gap at +X is the entrance, and
          leaving the one opposite open keeps the interior readable when the
          camera passes on its left-hand run. */}
      {POST_ANGLES.map((a, i) => {
        if (i === 0 || i === 3) return null;
        const mid = a + Math.PI / GAZEBO.posts;
        return (
          <mesh
            key={i}
            geometry={bag.drape}
            position={[Math.cos(mid) * POST_R, h * 0.65 + 0.16, Math.sin(mid) * POST_R]}
            // Yaw so the drape's width lies along the bay chord. The Z term flips
            // it end-for-end, putting the blade's tapered end at the bottom where
            // gathered fabric belongs — Euler XYZ applies Z first, so the flip
            // happens in the drape's own space, before the yaw.
            rotation={[0, -mid - Math.PI / 2, Math.PI]}
            castShadow
          >
            <meshStandardMaterial {...sheet(PALETTE.ivory, { roughness: 0.93 })} />
          </mesh>
        );
      })}

      <Instanced geometry={bag.leaf} matrices={swag.leaves} tints={LEAF_TINTS} castShadow>
        <meshStandardMaterial {...foliage()} />
      </Instanced>
      <Instanced geometry={bag.bloom} matrices={swag.blooms} tints={BLOOM_TINTS}>
        <meshStandardMaterial {...paper(PALETTE.ivory, { roughness: 0.82 })} />
      </Instanced>

      {/* One pendant bulb inside. It's what makes the gazebo read as somewhere
          people stand and drink, rather than a shed. */}
      <mesh position={[0, h - 0.5, 0]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial {...emissive(PALETTE.glow, 3.2)} />
      </mesh>
      <mesh position={[0, h - 0.15, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.72, 4]} />
        <meshStandardMaterial {...paper(PALETTE.espresso)} />
      </mesh>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Signpost
   ──────────────────────────────────────────────────────────────────────────── */

const BOARDS = [
  { y: 2.02, yaw: 0.0, len: 1.2 },
  { y: 1.66, yaw: 2.3, len: 1.05 },
  { y: 1.3, yaw: -1.9, len: 1.12 },
];

const BOARD_T = 0.028;

/**
 * Rotating a board by `yaw` about Y sends its local +X to this direction — so
 * anything positioned *along* a board has to be placed with it rather than at a
 * fixed offset, or the boards all end up pointing the same way.
 */
function alongBoard(yaw: number, distance: number): [number, number, number] {
  return [Math.cos(yaw) * distance, 0, -Math.sin(yaw) * distance];
}

/** …and its local +Z, which is the face you'd paint the lettering on. */
function boardFace(yaw: number, distance: number): [number, number, number] {
  return [Math.sin(yaw) * distance, 0, Math.cos(yaw) * distance];
}

export function Signpost() {
  const bag = useMemo(() => {
    const post = mergeGeom([
      { geo: new CylinderGeometry(0.06, 0.085, SIGNPOST.height, 6), position: [0, SIGNPOST.height / 2, 0] },
      { geo: new CylinderGeometry(0.11, 0.11, 0.06, 6), position: [0, SIGNPOST.height + 0.03, 0] },
      { geo: new CylinderGeometry(0.15, 0.17, 0.1, 8), position: [0, 0.05, 0] },
    ]);

    // A 3-sided cylinder is a triangular prism. Pre-rotated once so its axis runs
    // through the board's thickness and its point runs along the board — then the
    // outer merge only has to yaw it.
    const prism = () =>
      mergeGeom([
        {
          geo: new CylinderGeometry(0.155, 0.155, BOARD_T, 3),
          rotation: [Math.PI / 2, Math.PI / 2, 0],
        },
      ]);

    const boards = mergeGeom(
      BOARDS.flatMap(({ y, yaw, len }) => {
        const [mx, , mz] = alongBoard(yaw, len / 2);
        const [tx, , tz] = alongBoard(yaw, len);
        return [
          { geo: new BoxGeometry(len, 0.22, BOARD_T), position: [mx, y, mz] as const, rotation: [0, yaw, 0] as const },
          { geo: prism(), position: [tx, y, tz] as const, rotation: [0, yaw, 0] as const },
        ];
      })
    );

    return {
      post,
      boards,
      dash: new BoxGeometry(1, 0.026, 0.006),
      bloom: new IcosahedronGeometry(0.1, 0),
      leaf: bladeGeometry(0.09, 0.3, 0.3),
    };
  }, []);

  useDisposeBag(bag);

  /**
   * Lettering, as ink dashes.
   *
   * Deliberately not real text. drei's `<Text>` pulls its default typeface from a
   * CDN at runtime, and this site has to work with no network at all. At the
   * closest the camera ever gets, a row of weighted dashes reads as hand-painted
   * words anyway — and it cannot fail to load.
   */
  const dashes = useMemo(() => {
    const p = new Vector3();
    const e = new Euler();
    const q = new Quaternion();
    const s = new Vector3();
    const out: Matrix4[] = [];

    BOARDS.forEach(({ y, yaw, len }, b) => {
      let cursor = 0.15;
      for (let w = 0; w < 4; w++) {
        const wordLen = randRange(b * 31 + w * 7.1, 0.13, 0.26);
        if (cursor + wordLen > len - 0.22) break;

        const [ax, , az] = alongBoard(yaw, cursor + wordLen / 2);
        e.set(0, yaw, 0);
        q.setFromEuler(e);
        s.set(wordLen, 1, 1);

        // Painted on both faces — the camera sees this post from two directions.
        for (const side of [-1, 1] as const) {
          const [fx, , fz] = boardFace(yaw, side * (BOARD_T / 2 + 0.004));
          p.set(ax + fx, y, az + fz);
          out.push(new Matrix4().compose(p, q, s));
        }

        cursor += wordLen + 0.075;
      }
    });

    return out;
  }, []);

  /** A small planting at the foot, so the post isn't stuck in bare grass. */
  const base = useMemo(() => {
    const p = new Vector3();
    const e = new Euler();
    const q = new Quaternion();
    const s = new Vector3();
    return Array.from({ length: 46 }, (_, i) => {
      const seed = i * 8.3 + 5;
      const a = randRange(seed, 0, Math.PI * 2);
      const r = randRange(seed + 1, 0.16, 0.62);
      p.set(Math.cos(a) * r, randRange(seed + 2, 0.05, 0.34), Math.sin(a) * r);
      e.set(randRange(seed + 3, 0, Math.PI * 2), a, randRange(seed + 4, -0.6, 0.6));
      s.setScalar(randRange(seed + 5, 0.7, 1.4));
      return new Matrix4().compose(p, q.setFromEuler(e), s);
    });
  }, []);

  return (
    <group
      position={[SIGNPOST.position[0], SIGNPOST.position[1], SIGNPOST.position[2]]}
      rotation={[0, SIGNPOST.rotationY, 0]}
    >
      <mesh geometry={bag.post} castShadow receiveShadow>
        <meshStandardMaterial {...paper(PALETTE.trunkDark, { roughness: 0.93 })} />
      </mesh>

      <mesh geometry={bag.boards} castShadow receiveShadow>
        <meshStandardMaterial {...paper(PALETTE.ivory, { roughness: 0.86 })} />
      </mesh>

      <Instanced geometry={bag.dash} matrices={dashes}>
        <meshStandardMaterial {...paper(PALETTE.espresso, { roughness: 0.7 })} />
      </Instanced>

      {/* Gilt finial. */}
      <mesh position={[0, SIGNPOST.height + 0.15, 0]} castShadow>
        <coneGeometry args={[0.092, 0.2, 6]} />
        <meshStandardMaterial {...gilt()} />
      </mesh>

      <Instanced geometry={bag.leaf} matrices={base.slice(0, 34)} tints={LEAF_TINTS}>
        <meshStandardMaterial {...foliage()} />
      </Instanced>
      <Instanced geometry={bag.bloom} matrices={base.slice(34)} tints={BLOOM_TINTS}>
        <meshStandardMaterial {...paper(PALETTE.blush, { roughness: 0.84 })} />
      </Instanced>
    </group>
  );
}
