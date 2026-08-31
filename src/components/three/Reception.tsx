"use client";

/**
 * The reception: one long table under the string lights, benches either side, and
 * the cake on its own small table a little apart.
 */

import { useMemo } from "react";
import { BoxGeometry, Color, CylinderGeometry, Euler, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from "three";

import { RECEPTION } from "@/lib/layout";
import { PALETTE, foliage, gilt, paper, rand, randRange, sheet } from "./paper";
import { bladeGeometry, mergeGeom, useDisposeBag } from "./geo";
import { Instanced } from "./Instanced";

const [TW, TT, TL] = RECEPTION.tableSize; // width (x), top thickness, length (z)
const TH = RECEPTION.tableHeight;

/** Places along the table, from one end to the other. Drives every setting. */
const SEATS = 8;
function seatZ(i: number) {
  const span = TL - 1.5;
  return -span / 2 + (i / (SEATS - 1)) * span;
}

export function Reception() {
  const bag = useMemo(() => {
    /* ── the table ─────────────────────────────────────────────────────── */
    const legR = 0.055;
    const table = mergeGeom([
      { geo: new BoxGeometry(TW, TT, TL), position: [0, TH, 0] },
      // Trestles rather than four legs — a long table needs the mid support or
      // it reads as a floating plank.
      ...[-1, 0, 1].flatMap((k) =>
        [-1, 1].map((sx) => ({
          geo: new CylinderGeometry(legR, legR * 0.8, TH, 6),
          position: [sx * (TW / 2 - 0.18), TH / 2, k * (TL / 2 - 0.7)] as const,
        }))
      ),
      // A rail tying each trestle pair together.
      ...[-1, 0, 1].map((k) => ({
        geo: new BoxGeometry(TW - 0.3, 0.05, 0.05),
        position: [0, TH * 0.32, k * (TL / 2 - 0.7)] as const,
      })),
    ]);

    /* ── benches ───────────────────────────────────────────────────────── */
    const benchH = 0.44;
    const bench = mergeGeom([
      { geo: new BoxGeometry(0.36, 0.045, TL - 0.4), position: [0, benchH, 0] },
      ...[-1, 0, 1].map((k) => ({
        geo: new BoxGeometry(0.3, benchH, 0.06),
        position: [0, benchH / 2, k * (TL / 2 - 0.8)] as const,
      })),
    ]);

    /* ── the runner and its trim ───────────────────────────────────────── */
    const runner = mergeGeom([
      { geo: new BoxGeometry(TW * 0.52, 0.008, TL - 0.5), position: [0, TH + TT / 2 + 0.006, 0] },
    ]);

    /* ── tableware, all instanced ──────────────────────────────────────── */
    const plate = mergeGeom([
      { geo: new CylinderGeometry(0.145, 0.125, 0.016, 16), position: [0, 0, 0] },
      { geo: new CylinderGeometry(0.088, 0.088, 0.02, 16), position: [0, 0.014, 0] },
    ]);
    // A tapered bowl on a stem — unmistakably a wine glass in silhouette.
    const glass = mergeGeom([
      { geo: new CylinderGeometry(0.052, 0.028, 0.085, 8), position: [0, 0.115, 0] },
      { geo: new CylinderGeometry(0.008, 0.008, 0.075, 6), position: [0, 0.037, 0] },
      { geo: new CylinderGeometry(0.038, 0.04, 0.008, 8), position: [0, 0.004, 0] },
    ]);
    const napkin = new BoxGeometry(0.1, 0.014, 0.16);

    /* ── centrepieces ──────────────────────────────────────────────────── */
    const vase = mergeGeom([
      { geo: new CylinderGeometry(0.075, 0.06, 0.2, 9), position: [0, 0.1, 0] },
      { geo: new CylinderGeometry(0.086, 0.078, 0.03, 9), position: [0, 0.205, 0] },
    ]);

    /* ── the cake ──────────────────────────────────────────────────────── */
    const cake = mergeGeom([
      { geo: new CylinderGeometry(0.42, 0.44, 0.26, 18), position: [0, 0.13, 0] },
      { geo: new CylinderGeometry(0.3, 0.32, 0.24, 18), position: [0, 0.38, 0] },
      { geo: new CylinderGeometry(0.19, 0.21, 0.22, 18), position: [0, 0.61, 0] },
    ]);
    const cakeTable = mergeGeom([
      { geo: new CylinderGeometry(0.72, 0.7, 0.05, 16), position: [0, 0.76, 0] },
      { geo: new CylinderGeometry(0.07, 0.09, 0.76, 8), position: [0, 0.38, 0] },
      { geo: new CylinderGeometry(0.34, 0.36, 0.05, 16), position: [0, 0.025, 0] },
    ]);

    return {
      table,
      bench,
      runner,
      plate,
      glass,
      napkin,
      vase,
      cake,
      cakeTable,
      bloom: new IcosahedronGeometry(0.075, 0),
      leaf: bladeGeometry(0.07, 0.2, 0.3),
    };
  }, []);

  useDisposeBag(bag);

  /** Every setting laid out from `SEATS`, so adding a place adds all its pieces. */
  const settings = useMemo(() => {
    const plates: Matrix4[] = [];
    const glasses: Matrix4[] = [];
    const napkins: Matrix4[] = [];
    const vases: Matrix4[] = [];
    const blooms: Matrix4[] = [];
    const leaves: Matrix4[] = [];

    const p = new Vector3();
    const e = new Euler();
    const q = new Quaternion();
    const s = new Vector3(1, 1, 1);
    const top = TH + TT / 2;

    let seed = 0;
    const push = (out: Matrix4[], x: number, y: number, z: number, yaw: number, scale = 1) => {
      p.set(x, y, z);
      e.set(0, yaw, 0);
      s.setScalar(scale);
      out.push(new Matrix4().compose(p, q.setFromEuler(e), s));
    };

    for (let i = 0; i < SEATS; i++) {
      const z = seatZ(i);
      for (const side of [-1, 1] as const) {
        seed += 1;
        const x = side * (TW / 2 - 0.42);
        // Nothing on a laid table is perfectly square to the edge.
        const jx = randRange(seed * 4.1, -0.025, 0.025);
        const jz = randRange(seed * 6.3, -0.03, 0.03);

        push(plates, x + jx, top + 0.008, z + jz, randRange(seed * 2.9, 0, Math.PI));
        push(glasses, x + side * -0.06 + jx, top, z - 0.2 + jz, randRange(seed * 3.3, 0, Math.PI));
        push(napkins, x + side * 0.19 + jx, top + 0.01, z + jz, randRange(seed * 5.7, -0.2, 0.2));
      }
    }

    // Three centrepieces down the middle, each with its own little arrangement.
    for (let v = 0; v < 3; v++) {
      const z = (v - 1) * (TL / 3.2);
      push(vases, 0, top, z, randRange(v * 11.1, 0, Math.PI));

      for (let b = 0; b < 14; b++) {
        const seedB = v * 100 + b * 7.7;
        const a = rand(seedB) * Math.PI * 2;
        const r = randRange(seedB + 1, 0, 0.14);
        push(
          b % 4 === 0 ? leaves : blooms,
          Math.cos(a) * r,
          top + randRange(seedB + 2, 0.24, 0.42),
          z + Math.sin(a) * r,
          a,
          randRange(seedB + 3, 0.7, 1.4)
        );
      }
    }

    return { plates, glasses, napkins, vases, blooms, leaves };
  }, []);

  const [tx, , tz] = RECEPTION.tablePosition;
  const [cx, , cz] = RECEPTION.cakePosition;

  return (
    <>
      <group position={[tx, 0, tz]}>
        <mesh geometry={bag.table} castShadow receiveShadow>
          <meshStandardMaterial {...paper(PALETTE.paper, { roughness: 0.84 })} />
        </mesh>

        {[-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={bag.bench}
            position={[side * RECEPTION.benchOffset, 0, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial {...paper(PALETTE.paperShade, { roughness: 0.86 })} />
          </mesh>
        ))}

        <mesh geometry={bag.runner} receiveShadow>
          <meshStandardMaterial {...sheet(PALETTE.runner)} />
        </mesh>

        <Instanced geometry={bag.plate} matrices={settings.plates} castShadow>
          <meshStandardMaterial {...paper(PALETTE.ivory, { roughness: 0.55 })} />
        </Instanced>
        <Instanced geometry={bag.glass} matrices={settings.glasses} castShadow>
          <meshStandardMaterial {...paper(PALETTE.ivory, { roughness: 0.28, transparent: true, opacity: 0.68 })} />
        </Instanced>
        <Instanced geometry={bag.napkin} matrices={settings.napkins} castShadow tints={NAPKIN_TINTS}>
          <meshStandardMaterial {...paper(PALETTE.blush)} />
        </Instanced>
        <Instanced geometry={bag.vase} matrices={settings.vases} castShadow>
          <meshStandardMaterial {...gilt(PALETTE.goldPale, { roughness: 0.42 })} />
        </Instanced>
        <Instanced geometry={bag.leaf} matrices={settings.leaves}>
          <meshStandardMaterial {...foliage()} />
        </Instanced>
        <Instanced geometry={bag.bloom} matrices={settings.blooms} tints={BLOOM_TINTS}>
          <meshStandardMaterial {...paper(PALETTE.ivory, { roughness: 0.8 })} />
        </Instanced>
      </group>

      {/* The cake, set apart with room to walk around it. */}
      <group position={[cx, 0, cz]}>
        <mesh geometry={bag.cakeTable} castShadow receiveShadow>
          <meshStandardMaterial {...paper(PALETTE.paperShade, { roughness: 0.86 })} />
        </mesh>
        <mesh geometry={bag.cake} position={[0, 0.79, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...paper(PALETTE.ivory, { roughness: 0.6 })} />
        </mesh>
        {/* A gold ribbon at each tier join, and a bloom on top. */}
        {[0.79 + 0.26, 0.79 + 0.5].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} castShadow>
            <cylinderGeometry args={[i === 0 ? 0.325 : 0.215, i === 0 ? 0.325 : 0.215, 0.022, 18]} />
            <meshStandardMaterial {...gilt()} />
          </mesh>
        ))}
        <mesh geometry={bag.bloom} position={[0.04, 0.79 + 0.75, 0.02]} scale={1.6} castShadow>
          <meshStandardMaterial {...paper(PALETTE.rose, { roughness: 0.8 })} />
        </mesh>
      </group>
    </>
  );
}

const NAPKIN_TINTS = [new Color(PALETTE.blush), new Color(PALETTE.rose), new Color(PALETTE.paper)];
const BLOOM_TINTS = [
  new Color(PALETTE.ivory),
  new Color(PALETTE.blush),
  new Color(PALETTE.rose),
  new Color(PALETTE.goldPale),
];
