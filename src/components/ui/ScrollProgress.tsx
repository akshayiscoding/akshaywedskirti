"use client";

/**
 * The hairline progress rail at the top of the window.
 *
 * Reads `scroll.progress` from the mutable singleton on its own rAF and writes
 * straight to `style.transform`. Deliberately not React state: this updates on
 * every frame of every scroll, and routing it through a re-render would re-render
 * the entire page sixty times a second to move one bar.
 */

import { useEffect, useRef } from "react";

import { scroll } from "@/lib/scroll";
import { useSceneStore } from "@/lib/store";

export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const ready = useSceneStore((s) => s.ready);

  useEffect(() => {
    let frame = 0;
    let last = -1;

    const tick = () => {
      const p = Math.min(1, Math.max(0, scroll.progress));
      // Only touch the DOM when the value has actually moved a visible amount.
      if (Math.abs(p - last) > 0.0005) {
        last = p;
        if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-px"
      aria-hidden
      style={{ opacity: ready ? 1 : 0, transition: "opacity 700ms var(--ease-out-soft)" }}
    >
      <div
        ref={bar}
        className="h-full origin-left bg-gradient-to-r from-gold/70 via-gold to-rose-deep/80"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
