"use client";

import { useEffect } from "react";
import { sectionIds } from "@/content/wedding";
import { scroll } from "@/lib/scroll";
import { useSceneStore } from "@/lib/store";

/**
 * Translates document scroll into camera-flight progress.
 *
 * The naive version of this is `scrollY / (scrollHeight - innerHeight)`, but that
 * only lines the camera up with the sections if every section is exactly the same
 * height — and ours aren't (the FAQ is tall, the invitation is short). The camera
 * would arrive at the arch while the visitor was still reading the story.
 *
 * So instead we measure where each section's *centre* actually sits, find which
 * pair of sections the viewport centre currently falls between, and emit a
 * continuous `sectionFloat` (2.4 = 40% of the way from §2 to §3). Progress is
 * that value normalised. Now waypoint *i* is framed exactly when section *i* is
 * centred, whatever height the sections happen to be.
 *
 * Renders nothing.
 */
export function ScrollDriver() {
  const setActive = useSceneStore((s) => s.setActive);

  useEffect(() => {
    const n = sectionIds.length;
    if (n < 2) return;

    /** Document-space Y of each section's centre. Re-measured on resize. */
    let centres: number[] = [];
    let lastActive = -1;
    let lastProgress = 0;
    let lastTime = performance.now();
    let frame = 0;

    const measure = () => {
      const scrollY = window.scrollY;
      centres = sectionIds.map((id) => {
        const el = document.getElementById(id);
        if (!el) return 0;
        const box = el.getBoundingClientRect();
        // getBoundingClientRect is viewport-relative; add scrollY for doc space.
        return box.top + scrollY + box.height / 2;
      });
    };

    const update = () => {
      frame = 0;
      if (centres.length !== n) return;

      const viewCentre = window.scrollY + window.innerHeight / 2;

      // Locate the bracketing pair. Sections are in document order, so a linear
      // scan over ~9 entries is cheaper than anything cleverer.
      let sectionFloat: number;
      if (viewCentre <= centres[0]) {
        sectionFloat = 0;
      } else if (viewCentre >= centres[n - 1]) {
        sectionFloat = n - 1;
      } else {
        let i = 0;
        while (i < n - 2 && viewCentre > centres[i + 1]) i++;
        const span = centres[i + 1] - centres[i];
        sectionFloat = span > 0 ? i + (viewCentre - centres[i]) / span : i;
      }

      const progress = sectionFloat / (n - 1);

      const now = performance.now();
      const dt = Math.max(1, now - lastTime) / 1000;
      // Low-pass the velocity; raw frame-to-frame deltas are far too spiky to
      // drive anything visual.
      scroll.velocity = scroll.velocity * 0.8 + ((progress - lastProgress) / dt) * 0.2;
      lastTime = now;
      lastProgress = progress;

      scroll.progress = progress;
      scroll.sectionFloat = sectionFloat;

      // Only touch React state when the discrete section actually changes.
      const nextActive = Math.min(n - 1, Math.max(0, Math.round(sectionFloat)));
      if (nextActive !== lastActive) {
        lastActive = nextActive;
        setActive(sectionIds[nextActive]);
      }
    };

    /** Coalesce bursts of scroll events into one rAF-aligned update. */
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      onScroll();
    };

    measure();
    update();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // Sections change height as fonts land, images decode and accordions open,
    // so re-measure whenever the layout actually moves rather than guessing.
    const ro = new ResizeObserver(onResize);
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) ro.observe(el);
    });
    ro.observe(document.body);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [setActive]);

  return null;
}
