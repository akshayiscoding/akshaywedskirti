"use client";

/**
 * Festoon lights: poles carrying strings of bulbs over the aisle and out around
 * the reception table. The single most important object in the scene for selling
 * "evening" — the low sun does the rest.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  type BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  type InstancedMesh,
  Matrix4,
  type MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";

import { LIGHT_POLES } from "@/lib/layout";
import { useMotionEnabled } from "@/lib/store";
import { PALETTE, emissive, paper, randRange } from "./paper";
import { mergeGeom, sagCurve, useDisposeBag, type Part } from "./geo";
import { Instanced } from "./Instanced";

const H = LIGHT_POLES.height;

/**
 * Bulbs are split across this many materials so they can twinkle out of phase.
 *
 * Per-instance emissive would be the obvious way to do it, but `instanceColor`
 * only multiplies the diffuse term in a standard material — it never reaches
 * `emissiveIntensity`. Three phase-shifted materials costs three draw calls and
 * reads, at a distance, as every bulb flickering independently.
 */
const PHASES = 3;

/**
 * One span of wire and the bulbs hanging off it.
 *
 * The wire is a tube swept along the sag, and the bulbs are sampled from the same
 * `sagCurve` — so they sit *on* the wire by construction rather than by a fudge
 * factor that breaks the moment a pole moves in the layout.
 */
function buildChain(chain: ReadonlyArray<readonly [number, number]>, sag: number, spacing: number) {
  const wireParts: Part[] = [];
  const bulbPoints: Vector3[] = [];

  for (let i = 0; i < chain.length - 1; i++) {
    const a = new Vector3(chain[i][0], H, chain[i][1]);
    const b = new Vector3(chain[i + 1][0], H, chain[i + 1][1]);

    // Three radial segments: a triangular cord. At this thickness it's a single
    // dark line on screen, and it costs a third of a round tube.
    wireParts.push({ geo: new TubeGeometry(new CatmullRomCurve3(sagCurve(a, b, sag, 20)), 24, 0.014, 3, false) });

    const n = Math.max(4, Math.round(a.distanceTo(b) / spacing));
    const points = sagCurve(a, b, sag, n);
    // Drop the endpoints — those are the pole tops, where the wire is tied off.
    for (let k = 1; k < points.length - 1; k++) bulbPoints.push(points[k]);
  }

  return { wire: mergeGeom(wireParts), bulbPoints };
}

export function StringLights() {
  const motion = useMotionEnabled();

  const bag = useMemo(() => {
    const pole = mergeGeom([
      { geo: new CylinderGeometry(0.065, 0.095, H, 6), position: [0, H / 2, 0] },
      { geo: new CylinderGeometry(0.11, 0.11, 0.05, 6), position: [0, H + 0.02, 0] },
      // The hook the festoon is tied to.
      { geo: new TorusGeometry(0.075, 0.018, 4, 8), position: [0, H + 0.1, 0], rotation: [Math.PI / 2, 0, 0] },
      { geo: new CylinderGeometry(0.15, 0.18, 0.09, 8), position: [0, 0.045, 0] },
    ]);

    // The bulb's origin sits on the wire; the glass hangs below on a short flex.
    const bulb = mergeGeom([
      { geo: new CylinderGeometry(0.008, 0.008, 0.07, 4), position: [0, -0.035, 0] },
      { geo: new CylinderGeometry(0.033, 0.028, 0.035, 6), position: [0, -0.085, 0] },
      { geo: new SphereGeometry(0.062, 8, 6), position: [0, -0.15, 0], scale: [1, 1.25, 1] },
    ]);

    const aisle = buildChain(LIGHT_POLES.aisleChain, 1.05, 0.95);
    const reception = buildChain(LIGHT_POLES.receptionChain, 0.78, 0.85);

    return { pole, bulb, aisleWire: aisle.wire, receptionWire: reception.wire };
  }, []);

  useDisposeBag(bag);

  const placement = useMemo(() => {
    const p = new Vector3();
    const e = new Euler();
    const q = new Quaternion();
    const s = new Vector3();

    const poles = [...LIGHT_POLES.aisleChain, ...LIGHT_POLES.receptionChain].map(([x, z], i) => {
      p.set(x, 0, z);
      e.set(0, randRange(i * 5.3, 0, Math.PI * 2), 0);
      s.set(1, randRange(i * 7.9, 0.94, 1.06), 1);
      return new Matrix4().compose(p, q.setFromEuler(e), s);
    });

    // Re-derive the bulb points rather than threading them out of `bag`: they're
    // pure functions of the layout, and keeping the two useMemos independent means
    // a geometry change can't silently desync the placement.
    const points = [
      ...buildChain(LIGHT_POLES.aisleChain, 1.05, 0.95).bulbPoints,
      ...buildChain(LIGHT_POLES.receptionChain, 0.78, 0.85).bulbPoints,
    ];

    const groups: Matrix4[][] = Array.from({ length: PHASES }, () => []);
    points.forEach((pt, i) => {
      // A bulb on a flex never hangs quite plumb.
      e.set(randRange(i * 3.1, -0.22, 0.22), 0, randRange(i * 4.7, -0.22, 0.22));
      s.setScalar(randRange(i * 6.1, 0.88, 1.12));
      groups[i % PHASES].push(new Matrix4().compose(pt, q.setFromEuler(e), s));
    });

    return { poles, groups };
  }, []);

  const materials = useRef<Array<MeshStandardMaterial | null>>([]);

  /**
   * The twinkle. Two sines per group at incommensurate rates, so the pattern
   * never visibly loops, and a floor of 2.1 so no bulb ever reads as *off* —
   * dead bulbs on a wedding festoon look like a fault, not atmosphere.
   */
  useFrame(({ clock }) => {
    if (!motion) return;
    const t = clock.elapsedTime;
    for (let g = 0; g < PHASES; g++) {
      const m = materials.current[g];
      if (!m) continue;
      const phase = (g / PHASES) * Math.PI * 2;
      m.emissiveIntensity = 2.9 + Math.sin(t * 0.9 + phase) * 0.45 + Math.sin(t * 2.37 + phase * 1.7) * 0.22;
    }
  });

  return (
    <>
      <Instanced geometry={bag.pole} matrices={placement.poles} castShadow receiveShadow>
        <meshStandardMaterial {...paper(PALETTE.trunkDark, { roughness: 0.93 })} />
      </Instanced>

      {[bag.aisleWire, bag.receptionWire].map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial {...paper(PALETTE.espresso, { roughness: 0.6 })} />
        </mesh>
      ))}

      {placement.groups.map((matrices, g) => (
        <InstancedBulbs
          key={g}
          geometry={bag.bulb}
          matrices={matrices}
          materialRef={(m) => {
            materials.current[g] = m;
          }}
        />
      ))}
    </>
  );
}

/**
 * Split out only so each phase group can hand its material back up to the frame
 * loop — otherwise this is exactly `Instanced`.
 */
function InstancedBulbs({
  geometry,
  matrices,
  materialRef,
}: {
  geometry: BufferGeometry;
  matrices: Matrix4[];
  materialRef: (m: MeshStandardMaterial | null) => void;
}) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    matrices.forEach((m, i) => node.setMatrixAt(i, m));
    node.instanceMatrix.needsUpdate = true;
    node.computeBoundingSphere();
  }, [matrices]);

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, Math.max(1, matrices.length)]}>
      <meshStandardMaterial ref={materialRef} {...emissive(PALETTE.glow, 2.9)} />
    </instancedMesh>
  );
}
