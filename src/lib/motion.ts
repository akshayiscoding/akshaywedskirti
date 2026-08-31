/**
 * Shared Framer Motion vocabulary.
 *
 * Two rules the whole site follows:
 *
 *  1. One easing curve for entrances (`ease.out`) and one for exits (`ease.in`),
 *     so unrelated components still feel like the same object.
 *  2. Every variant degrades to opacity-only when motion is reduced. Components
 *     read `useMotionEnabled()` and pass the result to these factories rather
 *     than branching on it themselves.
 */

import type { Transition, Variants } from "framer-motion";

/** Custom cubic-béziers. `out` is the workhorse: fast start, long soft landing. */
export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  in: [0.7, 0, 0.84, 0] as const,
  /** Slight overshoot for chips and buttons. */
  spring: [0.34, 1.56, 0.64, 1] as const,
};

export const duration = {
  fast: 0.28,
  base: 0.6,
  slow: 0.95,
  glacial: 1.5,
} as const;

export const transition = {
  base: { duration: duration.base, ease: ease.out } satisfies Transition,
  slow: { duration: duration.slow, ease: ease.out } satisfies Transition,
  fast: { duration: duration.fast, ease: ease.out } satisfies Transition,
} as const;

/**
 * Fade and rise. `motion=false` collapses the travel to zero so a
 * reduced-motion visitor still gets the reveal, just without the movement.
 */
export function riseIn(motion = true, distance = 28, delay = 0): Variants {
  return {
    hidden: { opacity: 0, y: motion ? distance : 0 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: motion ? duration.slow : duration.fast, ease: ease.out, delay },
    },
  };
}

export function fadeIn(motion = true, delay = 0): Variants {
  return {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: motion ? duration.base : duration.fast, ease: ease.out, delay } },
  };
}

export function scaleIn(motion = true, from = 0.94, delay = 0): Variants {
  return {
    hidden: { opacity: 0, scale: motion ? from : 1 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: motion ? duration.slow : duration.fast, ease: ease.out, delay },
    },
  };
}

/** Slide in from a side — used by the story timeline's alternating beats. */
export function slideIn(motion = true, from: "left" | "right" = "left", distance = 44): Variants {
  const x = from === "left" ? -distance : distance;
  return {
    hidden: { opacity: 0, x: motion ? x : 0 },
    show: { opacity: 1, x: 0, transition: { duration: motion ? duration.slow : duration.fast, ease: ease.out } },
  };
}

/**
 * Parent that releases its children one after another.
 * Children should use `hidden`/`show` variant names to inherit the cascade.
 */
export function stagger(motion = true, each = 0.09, delayChildren = 0.05): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: motion ? each : 0,
        delayChildren: motion ? delayChildren : 0,
      },
    },
  };
}

/** Per-word or per-line mask reveal for display type. */
export function maskUp(motion = true, delay = 0): Variants {
  return {
    hidden: { y: motion ? "110%" : "0%", opacity: motion ? 1 : 0 },
    show: {
      y: "0%",
      opacity: 1,
      transition: { duration: motion ? 0.9 : duration.fast, ease: ease.out, delay },
    },
  };
}

/** Accordion body. Height animation needs `overflow: hidden` on the element. */
export const accordion: Variants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: 0.32, ease: ease.inOut } },
  open: { height: "auto", opacity: 1, transition: { duration: 0.42, ease: ease.out } },
};

/** Standard viewport trigger — fires once, a little before the element centres. */
export const inView = { once: true, amount: 0.25, margin: "0px 0px -12% 0px" } as const;
