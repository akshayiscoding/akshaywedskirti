"use client";

/**
 * The ground the whole diorama stands on: the meadow, the aisle runner laid over
 * it, and the layered paper hills on the horizon.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  Color,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
} from "three";

import { AISLE, GROUND_SIZE, HILLS } from "@/lib/layout";
import { PALETTE, paper, rand, randRange, sheet } from "./paper";
import { bladeGeometry, mergeGeom, smoothstep, useDisposeBag } from "./geo";

/**
 * Places that must stay level, as circles of (x, z, radius).
 *
 * The meadow rolls, but it can't roll under the dais or the reception table —
 * furniture would float on one side and sink on the other, and the aisle runner
 * would show daylight beneath it.
 */
const FLAT_ZONES: ReadonlyArray<readonly [number, number, number]> = [
  [0, -14, 9], // ceremony dais
  [0, -4, 8], // seating
  [0, 5, 7], // aisle exit
  [10, 4, 7.5], // reception table
  [12.6, 0, 4], // cake
  [-12, -4, 5], // gazebo
  [-9, 6, 3], // signpost
];

/** How much of the rolling terrain survives at this point. */
function terrainMask(x: number, z: number) {
  let mask = 1;
  for (const [cx, cz, r] of FLAT_ZONES) {
    const d = Math.hypot(x - cx, z - cz);
    // Level inside the circle, ramping back to full height over the next 60%.
    mask = Math.min(mask, smoothstep(r, r * 1.6, d));
  }
  return mask;
}

/* ────────────────────────────────────────────────────────────────────────────
   Meadow
   ──────────────────────────────────────────────────────────────────────────── */

export function Ground() {
  const geometry = useMemo(() => {
    // 40 segments over 150 units is a ~3.7m facet: coarse enough to read as
    // folded card, fine enough that the fold lines don't cut through furniture.
    const geo = new PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 40, 40);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const green = new Color(PALETTE.grass);
    const dry = new Color(PALETTE.grassDry);
    const c = new Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      // Still in plane-local space, so the second axis is Y and "up" is Z.
      const z = pos.getY(i);

      // Two coherent waves for the landform, plus per-vertex jitter to break the
      // grid up into irregular facets.
      const roll = Math.sin(x * 0.055) * Math.cos(z * 0.045) * 1.15 + Math.sin(z * 0.09 + 1.7) * 0.42;
      const jitter = (rand(i * 3.13) - 0.5) * 0.55;

      pos.setZ(i, (roll + jitter) * terrainMask(x, -z));

      // Sun-bleached on the rises, greener in the hollows — the same field that
      // drives the height, so the colour and the landform agree.
      c.copy(green).lerp(dry, smoothstep(-0.4, 1.3, roll) * 0.85);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute("color", new BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  useDisposeBag({ geometry });

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial {...paper(PALETTE.grass, { vertexColors: true, roughness: 0.95 })} />
    </mesh>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Aisle runner
   ──────────────────────────────────────────────────────────────────────────── */

const RUNNER_LENGTH = AISLE.zEnd - AISLE.zStart;
const RUNNER_CENTRE = (AISLE.zStart + AISLE.zEnd) / 2;

export function AisleRunner() {
  const bag = useMemo(() => {
    // Cloth, so it ripples. Without this it's a decal on the grass.
    const cloth = new PlaneGeometry(AISLE.width, RUNNER_LENGTH, 6, 40);
    const pos = cloth.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / AISLE.width;
      const v = pos.getY(i) / RUNNER_LENGTH;
      // A long slow undulation down the length, and a slight lift at the edges
      // where fabric never lies quite flat.
      pos.setZ(i, Math.sin(v * 11) * 0.028 + Math.cos(v * 5.5 + 1.2) * 0.02 + u * u * 0.05);
    }
    cloth.computeVertexNormals();

    // Gold trim, one strip each side.
    const trim = mergeGeom(
      [-1, 1].map((side) => ({
        geo: new PlaneGeometry(0.05, RUNNER_LENGTH),
        position: [(side * (AISLE.width - 0.09)) / 2, 0, 0.004] as const,
      }))
    );

    const petal = bladeGeometry(0.16, 0.22, 0.16);

    return { cloth, trim, petal };
  }, []);

  useDisposeBag(bag);

  // Petals already thrown, lying where they fell. Denser at the arch end, where
  // the flower girl has run out of self-restraint.
  const fallen = useMemo(() => {
    const e = new Euler();
    const q = new Quaternion();
    const p = new Vector3();
    const s = new Vector3();

    return Array.from({ length: 90 }, (_, i) => {
      const bias = rand(i * 5.7) ** 1.6; // crowds toward 0, i.e. the arch
      p.set(
        randRange(i * 9.1 + 4, -AISLE.width / 2 - 0.55, AISLE.width / 2 + 0.55),
        0.016 + rand(i * 1.9) * 0.012,
        // Local Z, before the group's own rotation — measured from the runner's
        // centre, which is why it's offset by half the length.
        bias * RUNNER_LENGTH - RUNNER_LENGTH / 2
      );
      // Lying flat, with a little lift and a random yaw. Petals don't land
      // aligned to anything.
      e.set(-Math.PI / 2 + randRange(i * 2.7, -0.3, 0.3), randRange(i * 4.4, 0, Math.PI * 2), 0);
      s.setScalar(randRange(i * 6.6, 0.75, 1.25));
      return new Matrix4().compose(p, q.setFromEuler(e), s);
    });
  }, []);

  return (
    <group position={[AISLE.x, 0.028, RUNNER_CENTRE]}>
      <mesh geometry={bag.cloth} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial {...sheet(PALETTE.runner, { roughness: 0.94 })} />
      </mesh>
      <mesh geometry={bag.trim} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial {...sheet(PALETTE.goldPale, { roughness: 0.5, metalness: 0.4 })} />
      </mesh>

      <FallenPetals geometry={bag.petal} matrices={fallen} />
    </group>
  );
}

function FallenPetals({ geometry, matrices }: { geometry: PlaneGeometry; matrices: Matrix4[] }) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const tint = new Color();
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      // Three tones, so the scatter doesn't read as one flat colour.
      tint.set(i % 3 === 0 ? PALETTE.ivory : i % 3 === 1 ? PALETTE.blush : PALETTE.rose);
      mesh.setColorAt(i, tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [matrices]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, matrices.length]} frustumCulled={false}>
      <meshStandardMaterial {...sheet(PALETTE.blush)} />
    </instancedMesh>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Horizon
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Layered hill cut-outs.
 *
 * Deliberately `meshBasicMaterial`: these are flat paper silhouettes standing
 * behind the sun, so lighting them would only muddy them. Basic material still
 * receives fog, which is what actually separates the layers.
 */
export function Hills() {
  const bag = useMemo(() => {
    const tints = [PALETTE.hill0, PALETTE.hill1, PALETTE.hill2];

    const geometries = HILLS.map((hill, layer) => {
      const shape = new Shape();
      shape.moveTo(-hill.w / 2, -6);

      // Walk left to right, dropping a rolling crest every few segments. Seeded
      // per layer so the three ridge lines never rhyme with each other.
      const steps = 26;
      shape.lineTo(-hill.w / 2, hill.h * 0.42);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = -hill.w / 2 + t * hill.w;
        const crest =
          hill.h *
          (0.55 +
            0.45 * Math.sin(t * Math.PI * (2.2 + layer * 0.8) + layer * 2.1) * 0.5 +
            0.3 * rand(i * 7.3 + layer * 91));
        shape.lineTo(x, crest);
      }
      shape.lineTo(hill.w / 2, hill.h * 0.42);
      shape.lineTo(hill.w / 2, -6);
      shape.closePath();

      return new ShapeGeometry(shape, 1);
    });

    return { geometries, tints };
  }, []);

  useDisposeBag(bag);

  return (
    <group>
      {HILLS.map((hill, i) => (
        <mesh key={i} geometry={bag.geometries[i]} position={[0, 0, hill.z]}>
          <meshBasicMaterial color={bag.tints[hill.tint]} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
