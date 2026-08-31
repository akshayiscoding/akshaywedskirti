/**
 * Per-frame scroll state.
 *
 * This deliberately lives OUTSIDE React. The camera rig reads `scroll.progress`
 * on every one of the 60 frames per second; routing that through React state
 * would re-render the whole tree 60×/s. Discrete state that genuinely needs a
 * re-render (which section is active, quality tier, ready flag) lives in the
 * zustand store in `./store`.
 */

export const scroll = {
  /** Raw normalised document scroll, 0 → 1. Written by ScrollDriver. */
  progress: 0,
  /** Critically-damped follower of `progress`. Written by CameraRig. */
  eased: 0,
  /** Signed scroll velocity in progress-units per second. */
  velocity: 0,
  /** Continuous section position, e.g. 2.4 = 40% of the way from §2 to §3. */
  sectionFloat: 0,
};

export type ScrollState = typeof scroll;

/** Reset between hot reloads so the camera doesn't inherit a stale position. */
export function resetScroll() {
  scroll.progress = 0;
  scroll.eased = 0;
  scroll.velocity = 0;
  scroll.sectionFloat = 0;
}

/**
 * Frame-rate independent exponential smoothing.
 *
 * The naive `a += (b - a) * 0.1` is frame-rate dependent — it converges twice
 * as fast at 120fps as at 60fps. This uses the exponential form so the camera
 * feels identical on a 60Hz laptop and a 120Hz iPad.
 *
 * @param lambda Higher = snappier. ~4 is languid, ~12 is responsive.
 */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return target + (current - target) * Math.exp(-lambda * dt);
}
