import { CatmullRomCurve3, Vector3 } from "three";
import { sectionIds } from "@/content/wedding";

export type Waypoint = {
  /** Camera position. */
  p: [number, number, number];
  /** Point the camera looks at. */
  t: [number, number, number];
  /** Field of view in degrees — narrower reads as more intimate. */
  fov: number;
  /** Camera roll in radians. A degree or two stops shots feeling mechanical. */
  roll?: number;
};

/**
 * One waypoint per section, in section order. The camera rides a Catmull-Rom
 * spline through these as the page scrolls, so waypoint *i* is framed exactly
 * when section *i* is centred.
 *
 * Keep this array the same length as `wedding.sections` — the dev-time
 * assertion below will shout if it drifts.
 */
export const WAYPOINTS: Waypoint[] = [
  // 0 · hero — wide establishing shot, high and back, whole grove in frame
  { p: [0, 9.5, 27], t: [0, 3.4, -9], fov: 42 },

  // 1 · invitation — drift down the aisle toward the arch
  { p: [0.6, 4.4, 12.5], t: [0, 3.3, -13.5], fov: 38 },

  // 2 · story — low and off-centre, travelling past the chair blocks
  { p: [-3.6, 1.45, 3.5], t: [0.8, 1.7, -12], fov: 46, roll: 0.015 },

  // 3 · schedule — rise and swing over the long reception table
  { p: [7.2, 4.8, 11.5], t: [10.4, 0.9, 3], fov: 44, roll: -0.02 },

  // 4 · venue — pull wide left, hills and signpost on the horizon
  { p: [-15.5, 6.8, 15], t: [-3, 3.2, -20], fov: 50 },

  // 5 · gallery — close orbit past the gazebo
  { p: [-20, 3.4, -1.5], t: [-11.4, 2.1, -5.2], fov: 40, roll: 0.02 },

  // 6 · party — glide behind the tree line, lanterns overhead
  { p: [-7, 5.8, -23], t: [6, 4.6, -11], fov: 47, roll: -0.015 },

  // 7 · faq — high, calm, the whole diorama laid out below
  { p: [15, 14, -17], t: [0, 1.2, -4], fov: 45 },

  // 8 · rsvp — settle in front of the arch, golden hour, close
  { p: [0, 2.9, -6.2], t: [0, 3.5, -13.7], fov: 36 },
];

if (process.env.NODE_ENV !== "production" && WAYPOINTS.length !== sectionIds.length) {
  console.warn(
    `[curve] ${WAYPOINTS.length} camera waypoints but ${sectionIds.length} sections. ` +
      `The camera flight and the page will drift out of sync — add or remove a waypoint in src/lib/curve.ts.`
  );
}

const toVec = (a: [number, number, number]) => new Vector3(...a);

/**
 * `centripetal` parameterisation, not the default `catmullrom`: our waypoints
 * are unevenly spaced (the gallery hop is short, the venue pull-back is long)
 * and uniform Catmull-Rom forms cusps and overshoots when spacing varies.
 * Centripetal is provably cusp-free.
 *
 * Note we sample with `getPoint`, NOT `getPointAt`. `getPointAt` re-parameterises
 * by arc length, which would slide the knots off their sections; `getPoint(i/(n-1))`
 * lands exactly on waypoint i.
 */
export const positionCurve = new CatmullRomCurve3(
  WAYPOINTS.map((w) => toVec(w.p)),
  false,
  "centripetal",
  0.5
);

export const targetCurve = new CatmullRomCurve3(
  WAYPOINTS.map((w) => toVec(w.t)),
  false,
  "centripetal",
  0.5
);

const SEGMENTS = WAYPOINTS.length - 1;

/** Smootherstep — zero 1st and 2nd derivative at both ends, so no visible jerk. */
function smootherstep(x: number) {
  const c = Math.min(1, Math.max(0, x));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

/**
 * Ease *within* each segment while keeping the knots pinned. The camera slows
 * as it arrives at a section and accelerates as it leaves, which reads as
 * intent rather than a constant-speed dolly.
 */
function easeAlongPath(progress: number) {
  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * SEGMENTS;
  const i = Math.min(SEGMENTS - 1, Math.floor(scaled));
  const localT = scaled - i;
  // Blend eased and linear so long segments don't feel like they stall mid-way.
  const shaped = 0.72 * smootherstep(localT) + 0.28 * localT;
  return (i + shaped) / SEGMENTS;
}

const _pos = new Vector3();
const _tgt = new Vector3();

export type FlightSample = {
  position: Vector3;
  target: Vector3;
  fov: number;
  roll: number;
};

const sample: FlightSample = {
  position: _pos,
  target: _tgt,
  fov: WAYPOINTS[0].fov,
  roll: 0,
};

/**
 * Sample the flight at a normalised scroll progress.
 *
 * Returns a shared, mutated object — cheap enough to call every frame, but do
 * not hold onto the returned vectors across frames.
 */
export function sampleFlight(progress: number): FlightSample {
  const t = easeAlongPath(progress);
  positionCurve.getPoint(t, _pos);
  targetCurve.getPoint(t, _tgt);

  // fov and roll interpolate linearly between the two bracketing waypoints,
  // using the same eased local parameter so they stay locked to the motion.
  const scaled = Math.min(1, Math.max(0, progress)) * SEGMENTS;
  const i = Math.min(SEGMENTS - 1, Math.floor(scaled));
  const local = 0.72 * smootherstep(scaled - i) + 0.28 * (scaled - i);
  const a = WAYPOINTS[i];
  const b = WAYPOINTS[i + 1];
  sample.fov = a.fov + (b.fov - a.fov) * local;
  sample.roll = (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * local;

  return sample;
}

/** Progress value at which section `index` is exactly framed. */
export function progressForSection(index: number) {
  return SEGMENTS === 0 ? 0 : Math.min(1, Math.max(0, index / SEGMENTS));
}
