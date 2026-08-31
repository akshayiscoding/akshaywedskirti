"use client";

import { useEffect } from "react";
import { useSceneStore, type Quality } from "@/lib/store";

/** `navigator.deviceMemory` is Chrome-only and absent from the DOM lib types. */
type NavigatorWithHints = Navigator & { deviceMemory?: number };

/**
 * Picks a starting quality tier from what the device is willing to tell us.
 *
 * These signals are all crude — `hardwareConcurrency` counts cores, not GPU
 * capability, and Safari lies about it — so this is a starting guess only. The
 * frame-rate watchdog inside the canvas is what actually keeps things smooth; it
 * will drop a tier if the guess was optimistic.
 */
function guessQuality(): Quality {
  if (typeof window === "undefined") return "high";

  const nav = navigator as NavigatorWithHints;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 820;

  // Phones and small tablets: start conservative. A phone that can handle more
  // will simply stay at "mid", which still has shadows and every scene element.
  if (coarse && narrow) return cores <= 4 || memory <= 2 ? "low" : "mid";

  if (cores >= 8 && memory >= 8) return "high";
  if (cores <= 2 || memory <= 2) return "low";
  return "mid";
}

/**
 * Client-side environment probe. Renders nothing, mounts once, and seeds the
 * store with the two facts that every other component branches on: whether the
 * visitor wants motion, and how much scene we can afford to draw.
 *
 * This lives above the canvas because the nav and the DOM sections need the
 * reduced-motion answer too, and the canvas is lazily loaded.
 */
export function Bootstrap() {
  const setQuality = useSceneStore((s) => s.setQuality);
  const setReducedMotion = useSceneStore((s) => s.setReducedMotion);

  useEffect(() => {
    setQuality(guessQuality());
  }, [setQuality]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    // Visitors do toggle this in the middle of a session, and the whole site
    // reads from the store, so honour the change live.
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setReducedMotion]);

  return null;
}
