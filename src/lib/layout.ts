/**
 * The diorama's floor plan, in world units (1 unit ≈ 1 metre).
 *
 * Every scene component imports from here rather than hardcoding positions, so
 * nothing ends up inside a tree and the camera waypoints in `./curve` stay
 * meaningful. Looking down from above: +X is right, +Z is toward the viewer,
 * the ceremony arch sits at the far (−Z) end and the aisle runs toward +Z.
 *
 *                              ─── hills (z ≈ −55) ───
 *                                     ▲ trees
 *          gazebo ▢                 ╭─────╮                  ▲ trees
 *         (−12,−4)                  │ARCH │  (0,−14)
 *                                   ╰─────╯
 *                            ▬▬▬  ▬▬▬   chair blocks
 *                            ▬▬▬  ▬▬▬   (±2.2 … ±5.4)
 *                            ▬▬▬  ▬▬▬                  ▤ long table (10, 4)
 *                                 ║ aisle x=0          ● cake (12.6, 0)
 *              signpost ┃ (−9, 6)  ║
 */

export const GROUND_SIZE = 150;

export const AISLE = {
  x: 0,
  /** Runner runs from the arch to the seating exit. */
  zStart: -13,
  zEnd: 7,
  width: 2.6,
} as const;

export const ARCH = {
  position: [0, 0, -14] as const,
  /** Outer radius of the arch opening. */
  radius: 3.1,
  /** Thickness of the paper tube. */
  tube: 0.17,
  /** Height of the straight legs before the curve begins. */
  legHeight: 2.2,
  rotationY: 0,
} as const;

export const PLATFORM = {
  /** Low stone dais the arch stands on. */
  position: [0, 0, -14] as const,
  radius: 5.2,
  height: 0.22,
} as const;

/** Six rows a side, two blocks a side, mirrored across the aisle. */
export const CHAIRS = {
  rows: 6,
  perRow: 3,
  rowGap: 1.5,
  seatGap: 0.82,
  /** Distance from aisle centre to the innermost chair. */
  innerX: 2.2,
  zFront: -10.4,
  /** Chairs turn a few degrees inward toward the arch. */
  toeIn: 0.09,
} as const;

export const RECEPTION = {
  tablePosition: [10, 0, 4] as const,
  tableSize: [3.1, 0.09, 9.4] as const,
  tableHeight: 0.78,
  benchOffset: 1.35,
  cakePosition: [12.6, 0, 0] as const,
} as const;

export const GAZEBO = {
  position: [-12, 0, -4] as const,
  radius: 2.9,
  height: 3.4,
  posts: 6,
} as const;

export const SIGNPOST = {
  position: [-9, 0, 6] as const,
  height: 2.35,
  rotationY: 0.42,
} as const;

/**
 * Poles that carry the string lights: a zig-zag over the aisle, then a run out
 * to the reception table. StringLights hangs catenaries between consecutive
 * entries of each chain.
 */
export const LIGHT_POLES = {
  height: 4.6,
  aisleChain: [
    [-4.6, -11.5],
    [4.6, -8.0],
    [-4.6, -4.5],
    [4.6, -1.0],
    [-4.6, 2.5],
    [4.6, 6.0],
  ] as ReadonlyArray<readonly [number, number]>,
  receptionChain: [
    [6.6, 9.4],
    [10.0, 8.2],
    [13.4, 4.0],
    [13.4, -0.6],
    [8.4, -1.2],
  ] as ReadonlyArray<readonly [number, number]>,
} as const;

/**
 * Tree positions, hand-placed to frame the camera flight and leave the aisle,
 * reception and gazebo clear. `s` is a scale multiplier, `k` selects one of the
 * three paper-tree silhouettes.
 */
export const TREES: ReadonlyArray<{ x: number; z: number; s: number; k: 0 | 1 | 2 }> = [
  { x: -8.6, z: -18.5, s: 1.25, k: 0 },
  { x: -14.2, z: -14.0, s: 1.05, k: 1 },
  { x: -18.6, z: -20.5, s: 1.4, k: 0 },
  { x: -21.0, z: -8.0, s: 1.15, k: 2 },
  { x: -16.5, z: 2.5, s: 0.95, k: 1 },
  { x: -20.4, z: 9.0, s: 1.3, k: 0 },
  { x: -12.0, z: 12.5, s: 1.0, k: 2 },
  { x: -6.0, z: 16.0, s: 1.18, k: 1 },
  { x: 8.2, z: -18.0, s: 1.3, k: 0 },
  { x: 14.6, z: -13.5, s: 1.1, k: 2 },
  { x: 19.5, z: -19.0, s: 1.45, k: 0 },
  { x: 21.5, z: -6.5, s: 1.2, k: 1 },
  { x: 18.0, z: 8.5, s: 1.05, k: 2 },
  { x: 12.5, z: 15.0, s: 1.28, k: 0 },
  { x: 4.0, z: 18.5, s: 1.1, k: 1 },
  { x: -2.5, z: 21.0, s: 1.22, k: 2 },
  { x: -26.0, z: -2.0, s: 1.5, k: 0 },
  { x: 26.5, z: 1.5, s: 1.42, k: 1 },
  { x: -24.0, z: -26.0, s: 1.6, k: 0 },
  { x: 24.0, z: -25.0, s: 1.55, k: 2 },
  { x: 0.5, z: -26.5, s: 1.35, k: 1 },
  { x: -10.0, z: -28.0, s: 1.3, k: 0 },
  { x: 11.0, z: -29.0, s: 1.38, k: 2 },
  { x: -30.0, z: 14.0, s: 1.6, k: 1 },
  { x: 30.0, z: 12.0, s: 1.5, k: 0 },
  { x: 6.5, z: 24.0, s: 1.3, k: 2 },
];

/** Layered paper hill cut-outs on the horizon. [z, height, width, tint index] */
export const HILLS: ReadonlyArray<{ z: number; h: number; w: number; tint: 0 | 1 | 2 }> = [
  { z: -38, h: 7.5, w: 120, tint: 0 },
  { z: -48, h: 11, w: 160, tint: 1 },
  { z: -60, h: 15.5, w: 200, tint: 2 },
];

/** Region petals fall through — a box the camera flight stays inside. */
export const PETAL_BOUNDS = {
  x: 34,
  z: 34,
  yMin: 0.1,
  yMax: 15,
} as const;

export const LANTERN_BOUNDS = {
  x: 22,
  z: 24,
  yMin: 5.5,
  yMax: 13,
} as const;
