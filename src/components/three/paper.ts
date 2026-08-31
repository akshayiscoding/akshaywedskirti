/**
 * The paper-craft look, in one place.
 *
 * Everything in the diorama is meant to read as cut, folded and glued card. Three
 * choices do most of that work:
 *
 *  1. `flatShading` — kills smooth normal interpolation so every facet reads as a
 *     discrete fold rather than a curved surface.
 *  2. High `roughness` with zero `metalness` — card is matte; the only metal in
 *     the scene is the arch's gold banding.
 *  3. `DoubleSide` on anything cut from a sheet, because real paper has no
 *     back-face culling.
 *
 * Colours are duplicated as CSS custom properties in globals.css. Keep the two
 * in step — this file is the source of truth.
 */

import { Color, DoubleSide, type MeshStandardMaterialParameters } from "three";

export const PALETTE = {
  /* — surfaces — */
  ivory: "#faf6f0",
  paper: "#f6efe4",
  paperShade: "#e8ddc9",
  stone: "#e3dacb",
  runner: "#f3e7da",

  /* — accents — */
  blush: "#e8c9c4",
  rose: "#d9a5a0",
  roseDeep: "#c07f7d",
  gold: "#c9a44c",
  goldPale: "#e0c583",

  /* — foliage: an olive grove, so sage and dust rather than emerald — */
  leafLight: "#a8b394",
  leaf: "#8b9a7b",
  leafDark: "#6f7f62",
  trunk: "#b0967a",
  trunkDark: "#8f7860",

  /* — ground & horizon, receding into warm haze — */
  grass: "#cfd2b4",
  grassDry: "#ddd6b8",
  hill0: "#c4c4a8",
  hill1: "#c9c3ad",
  hill2: "#d5cdba",

  /* — light — */
  glow: "#ffd79a",
  glowWarm: "#ffc46b",
  sun: "#ffe6c2",
  sky: "#f3e2d2",
  espresso: "#2a2320",
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Pre-built Color instances — avoids re-parsing hex strings inside useFrame. */
export const C = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [k, new Color(v)])
) as Record<PaletteKey, Color>;

/**
 * Base props for a folded-card surface.
 * Spread onto `<meshStandardMaterial {...paper()} />`.
 */
export function paper(
  color: string = PALETTE.paper,
  overrides: MeshStandardMaterialParameters = {}
): MeshStandardMaterialParameters {
  return {
    color,
    roughness: 0.88,
    metalness: 0,
    flatShading: true,
    ...overrides,
  };
}

/** A sheet cut from card — visible from both sides, so no culling. */
export function sheet(
  color: string = PALETTE.paper,
  overrides: MeshStandardMaterialParameters = {}
): MeshStandardMaterialParameters {
  return {
    color,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
    side: DoubleSide,
    ...overrides,
  };
}

/** Foliage: slightly less rough so it catches a hint of the low sun. */
export function foliage(
  color: string = PALETTE.leaf,
  overrides: MeshStandardMaterialParameters = {}
): MeshStandardMaterialParameters {
  return {
    color,
    roughness: 0.74,
    metalness: 0,
    flatShading: true,
    side: DoubleSide,
    ...overrides,
  };
}

/** The one genuinely metallic material in the scene. */
export function gilt(
  color: string = PALETTE.gold,
  overrides: MeshStandardMaterialParameters = {}
): MeshStandardMaterialParameters {
  return {
    color,
    roughness: 0.32,
    metalness: 0.85,
    flatShading: false,
    ...overrides,
  };
}

/** Emissive bulb / lantern skin. `intensity` scales the glow. */
export function emissive(
  color: string = PALETTE.glow,
  intensity = 2.4,
  overrides: MeshStandardMaterialParameters = {}
): MeshStandardMaterialParameters {
  return {
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.5,
    metalness: 0,
    toneMapped: false,
    ...overrides,
  };
}

/**
 * Deterministic pseudo-random in [0,1) from an integer seed.
 *
 * Instanced geometry needs per-instance jitter, but `Math.random()` would give
 * a different diorama on the server and the client and trip hydration checks
 * — and a different one on every hot reload, which makes tuning impossible.
 */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** Deterministic value in [min,max). */
export function randRange(seed: number, min: number, max: number) {
  return min + rand(seed) * (max - min);
}

/** Pick a deterministic entry from a list. */
export function randPick<T>(seed: number, list: readonly T[]): T {
  return list[Math.floor(rand(seed) * list.length) % list.length];
}
