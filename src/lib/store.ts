"use client";

import { create } from "zustand";
import type { SectionId } from "@/content/wedding";
import { sectionIds } from "@/content/wedding";

/**
 * Rendering quality tier. Chosen once on mount from device signals, then
 * allowed to degrade if the measured frame rate can't keep up.
 *
 *  high — desktop GPU: shadows, bloom, full petal count, dpr up to 2
 *  mid  — decent laptop / big tablet: shadows, no bloom, fewer petals
 *  low  — phone or weak GPU: no shadows, no post, minimal instances, dpr 1
 */
export type Quality = "high" | "mid" | "low";

export const QUALITY_PRESETS = {
  high: { petals: 900, lanterns: 14, shadows: true, shadowMap: 2048, post: true, dpr: [1, 2] as [number, number], trees: 26 },
  mid:  { petals: 420, lanterns: 9,  shadows: true, shadowMap: 1024, post: false, dpr: [1, 1.5] as [number, number], trees: 18 },
  low:  { petals: 150, lanterns: 5,  shadows: false, shadowMap: 512, post: false, dpr: [1, 1] as [number, number], trees: 11 },
} as const;

type SceneState = {
  /** Discrete active section — drives nav highlighting and section reveals. */
  active: SectionId;
  activeIndex: number;
  setActive: (id: SectionId) => void;

  quality: Quality;
  setQuality: (q: Quality) => void;
  /** Drop one tier. No-op at "low". Called by the perf watchdog. */
  degrade: () => void;

  /** True once the 3D scene has drawn its first real frame. */
  ready: boolean;
  setReady: (v: boolean) => void;

  /** OS-level prefers-reduced-motion, mirrored into the store. */
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;

  /** User override of the motion setting via the toggle in the nav. */
  motionOverride: boolean | null;
  setMotionOverride: (v: boolean | null) => void;

  /** Mobile nav sheet. */
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  active: "hero",
  activeIndex: 0,
  setActive: (id) => {
    if (get().active === id) return;
    set({ active: id, activeIndex: Math.max(0, sectionIds.indexOf(id)) });
  },

  quality: "high",
  setQuality: (quality) => set({ quality }),
  degrade: () => {
    const q = get().quality;
    if (q === "high") set({ quality: "mid" });
    else if (q === "mid") set({ quality: "low" });
  },

  ready: false,
  setReady: (ready) => set({ ready }),

  reducedMotion: false,
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),

  motionOverride: null,
  setMotionOverride: (motionOverride) => set({ motionOverride }),

  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
}));

/**
 * The effective answer to "should things move?" — user override wins over the
 * OS preference, because someone who explicitly asks for motion should get it.
 */
export function useMotionEnabled() {
  const reduced = useSceneStore((s) => s.reducedMotion);
  const override = useSceneStore((s) => s.motionOverride);
  return override ?? !reduced;
}

export function useQualityPreset() {
  const quality = useSceneStore((s) => s.quality);
  return QUALITY_PRESETS[quality];
}
