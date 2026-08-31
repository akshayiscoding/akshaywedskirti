"use client";

/**
 * Geometry plumbing shared by the diorama.
 *
 * The diorama is built almost entirely from primitives, and a paper chair made of
 * six boxes drawn thirty-six times is 216 draw calls for something the eye reads
 * as one object. So anything repeated gets merged into a single geometry first and
 * then instanced — `mergeGeom` is what makes that cheap to write.
 */

import { useEffect } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Euler,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";

export type Part = {
  geo: BufferGeometry;
  position?: readonly [number, number, number];
  /** Euler XYZ, radians. */
  rotation?: readonly [number, number, number];
  scale?: number | readonly [number, number, number];
};

// Scratch objects, reused across calls. mergeGeom is only ever called from a
// useMemo during setup, never from a frame loop, but allocating four throwaway
// maths objects per part is still pointless.
const _m = new Matrix4();
const _e = new Euler();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();

/**
 * Bake a list of transformed geometries into one.
 *
 * **Disposes the geometries you pass in** — every call site builds throwaway
 * primitives purely to be merged, so cleaning up here saves a dispose loop in
 * nine different components. The returned geometry is yours to dispose.
 */
export function mergeGeom(parts: Part[]): BufferGeometry {
  const clones: BufferGeometry[] = [];
  const sources = new Set<BufferGeometry>();

  for (const part of parts) {
    sources.add(part.geo);

    // Merging needs one vertex per triangle corner; an index buffer would make
    // the offsets meaningless.
    const g = part.geo.index ? part.geo.toNonIndexed() : part.geo.clone();

    if (part.position || part.rotation || part.scale !== undefined) {
      _p.set(...(part.position ?? [0, 0, 0]));
      _e.set(...(part.rotation ?? [0, 0, 0]));
      _q.setFromEuler(_e);
      const sc = part.scale ?? 1;
      if (typeof sc === "number") _s.setScalar(sc);
      else _s.set(...sc);
      // applyMatrix4 transforms normals by the normal matrix too, so non-uniform
      // scale stays correctly lit.
      g.applyMatrix4(_m.compose(_p, _q, _s));
    }

    clones.push(g);
  }

  const total = clones.reduce((n, g) => n + g.attributes.position.count, 0);
  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);

  let offset = 0;
  for (const g of clones) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    position.set(p.array as Float32Array, offset * 3);
    if (n) normal.set(n.array as Float32Array, offset * 3);
    offset += p.count;
  }

  const merged = new BufferGeometry();
  merged.setAttribute("position", new BufferAttribute(position, 3));
  merged.setAttribute("normal", new BufferAttribute(normal, 3));

  clones.forEach((g) => g.dispose());
  sources.forEach((g) => g.dispose());

  return merged;
}

/**
 * Disposes every geometry and material held in `bag` on unmount.
 *
 * r3f only auto-disposes what it created from JSX. Anything built in a `useMemo`
 * is ours to clean up, and a quality-tier change remounts the whole diorama — so
 * leaking here would leak once per degrade, on exactly the weak devices that
 * triggered it.
 */
export function useDisposeBag(bag: Record<string, unknown>) {
  useEffect(
    () => () => {
      const kill = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(kill);
        else if (v && typeof (v as { dispose?: unknown }).dispose === "function") {
          (v as { dispose: () => void }).dispose();
        }
      };
      Object.values(bag).forEach(kill);
    },
    [bag]
  );
}

/**
 * A blade of card, bowed along its length: petal, leaf, ribbon, hanging drape.
 *
 * The bow is the whole trick. A flat quad reads as a texture-mapped billboard; a
 * quad with a curve in it catches the light differently along its length and
 * reads as a physical cut-out.
 */
export function bladeGeometry(width: number, length: number, bow = 0.24, curl = 0.12) {
  const geo = new PlaneGeometry(width, length, 2, 4);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // 0 at the stem, 1 at the tip.
    const t = (y + length / 2) / length;
    // Lengthwise arc, plus a cross-sectional curl that deepens toward the tip.
    const z = Math.sin(Math.PI * t) * bow * length + (x / width) ** 2 * curl * length * t;
    pos.setZ(i, z);
    // Taper to a point so it isn't obviously a rectangle.
    pos.setX(i, x * (1 - 0.72 * t * t));
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Points along a hanging wire between `a` and `b`.
 *
 * Not a true catenary — a parabola with a sine correction, which is
 * indistinguishable at this scale and doesn't need `cosh` or a solver for the
 * curve parameter.
 */
export function sagCurve(a: Vector3, b: Vector3, sag: number, steps: number): Vector3[] {
  const out: Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = new Vector3().lerpVectors(a, b, t);
    p.y -= sag * Math.sin(Math.PI * t) * (0.72 + 0.28 * Math.sin(Math.PI * t));
    out.push(p);
  }
  return out;
}

/** Smooth 0→1 ramp. Shared by the sky, the hills and the camera easing. */
export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
