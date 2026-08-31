"use client";

/**
 * Guest seating: twelve rows of folding chairs either side of the aisle, and a
 * blush sash on the ones at the ends of the rows.
 */

import { useMemo } from "react";
import { BoxGeometry, CylinderGeometry, Euler, Matrix4, Quaternion, Vector3 } from "three";

import { CHAIRS } from "@/lib/layout";
import { PALETTE, paper, randRange, sheet } from "./paper";
import { bladeGeometry, mergeGeom, useDisposeBag } from "./geo";
import { Instanced } from "./Instanced";

const SEAT_H = 0.46;
const SEAT_W = 0.44;
const SEAT_D = 0.42;
const BACK_H = 0.5;

/**
 * One folding chair, merged into a single geometry.
 *
 * Six boxes per chair × 36 chairs is 216 draw calls for something the eye reads
 * as one repeated object. Merged and instanced it's one.
 */
function chairGeometry() {
  const legR = 0.017;
  const inset = 0.035;
  const legs: Parameters<typeof mergeGeom>[0] = [];

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      legs.push({
        geo: new CylinderGeometry(legR, legR * 0.85, SEAT_H, 5),
        position: [sx * (SEAT_W / 2 - inset), SEAT_H / 2, sz * (SEAT_D / 2 - inset)],
        // Splayed very slightly, the way a folding chair actually stands.
        rotation: [sz * -0.035, 0, sx * 0.035],
      });
    }
  }

  return mergeGeom([
    ...legs,
    // Seat: a card panel with a shallow forward tilt.
    { geo: new BoxGeometry(SEAT_W, 0.022, SEAT_D), position: [0, SEAT_H, 0], rotation: [0.045, 0, 0] },
    // Back panel, raked back, plus the two uprights carrying it.
    { geo: new BoxGeometry(SEAT_W * 0.94, BACK_H, 0.02), position: [0, SEAT_H + BACK_H / 2 + 0.06, -SEAT_D / 2 + 0.02], rotation: [-0.13, 0, 0] },
    { geo: new CylinderGeometry(legR, legR, BACK_H + 0.1, 5), position: [-(SEAT_W / 2 - inset), SEAT_H + (BACK_H + 0.1) / 2, -SEAT_D / 2 + 0.03], rotation: [-0.13, 0, 0] },
    { geo: new CylinderGeometry(legR, legR, BACK_H + 0.1, 5), position: [SEAT_W / 2 - inset, SEAT_H + (BACK_H + 0.1) / 2, -SEAT_D / 2 + 0.03], rotation: [-0.13, 0, 0] },
  ]);
}

/** Every chair's world transform, plus which ones get a sash. */
function layOutChairs() {
  const chairs: Matrix4[] = [];
  const sashes: Matrix4[] = [];

  const p = new Vector3();
  const e = new Euler();
  const q = new Quaternion();
  const s = new Vector3(1, 1, 1);
  const sashScale = new Vector3(1, 1, 1);

  let seed = 0;

  for (let row = 0; row < CHAIRS.rows; row++) {
    for (const side of [-1, 1] as const) {
      for (let col = 0; col < CHAIRS.perRow; col++) {
        seed += 1;

        const x = side * (CHAIRS.innerX + col * CHAIRS.seatGap);
        const z = CHAIRS.zFront + row * CHAIRS.rowGap;

        // Nobody ever pushes a chair back exactly straight. A few centimetres of
        // scatter and a couple of degrees of yaw is the difference between a
        // wedding and a conference room.
        p.set(x + randRange(seed * 3.7, -0.055, 0.055), 0, z + randRange(seed * 5.1, -0.07, 0.07));
        // Facing the arch at −Z, toed in toward the aisle.
        e.set(0, Math.PI + -side * CHAIRS.toeIn + randRange(seed * 7.3, -0.06, 0.06), 0);
        chairs.push(new Matrix4().compose(p, q.setFromEuler(e), s));

        // A sash on the aisle-side chair of each row — the one anybody actually
        // photographs. The geometry's own offset is baked in, so it inherits the
        // chair's yaw from the shared quaternion.
        if (col === 0) {
          p.y = SEAT_H + BACK_H * 0.62;
          sashes.push(new Matrix4().compose(p, q.setFromEuler(e), sashScale));
        }
      }
    }
  }

  return { chairs, sashes };
}

export function Chairs() {
  const bag = useMemo(
    () => ({
      chair: chairGeometry(),
      // The sash: a bow of two blades and a knot.
      sash: mergeGeom([
        { geo: bladeGeometry(0.16, 0.3, 0.35), position: [-0.11, -0.05, -0.24], rotation: [0, 0, -0.7] },
        { geo: bladeGeometry(0.16, 0.3, 0.35), position: [0.11, -0.05, -0.24], rotation: [0, 0, 0.7] },
        { geo: bladeGeometry(0.09, 0.34, 0.12), position: [0.02, -0.24, -0.24], rotation: [0.2, 0, 0.25] },
        { geo: new CylinderGeometry(0.035, 0.035, 0.05, 6), position: [0, 0, -0.24], rotation: [Math.PI / 2, 0, 0] },
      ]),
    }),
    []
  );

  useDisposeBag(bag);

  const { chairs, sashes } = useMemo(layOutChairs, []);

  return (
    <>
      <Instanced geometry={bag.chair} matrices={chairs} castShadow receiveShadow>
        <meshStandardMaterial {...paper(PALETTE.paper, { roughness: 0.85 })} />
      </Instanced>

      <Instanced geometry={bag.sash} matrices={sashes} castShadow>
        <meshStandardMaterial {...sheet(PALETTE.blush, { roughness: 0.86 })} />
      </Instanced>
    </>
  );
}
