"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { wedding } from "@/content/wedding";
import { ease } from "@/lib/motion";
import { useSceneStore } from "@/lib/store";
import { StaticBackdrop } from "./Scene";

/**
 * three.js touches `window` and needs a real WebGL context, so the canvas can't
 * be server-rendered. Loading it client-only also keeps ~700KB of three out of
 * the initial HTML payload — the DOM content and the type land first, the
 * diorama fades in behind it a beat later.
 */
const Scene = dynamic(() => import("./Scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => <StaticBackdrop />,
});

/**
 * The opening curtain.
 *
 * Held until the scene has drawn its first frame, with a hard 4.5s ceiling so a
 * failed or very slow WebGL init can never trap a visitor behind it. Someone who
 * came here to find out where the wedding is should never be stuck on a splash.
 */
function Curtain() {
  const ready = useSceneStore((s) => s.ready);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExpired(true), 4500);
    return () => clearTimeout(t);
  }, []);

  const lift = ready || expired;

  return (
    <AnimatePresence>
      {!lift && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ivory"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: ease.out }}
          aria-hidden
        >
          <div className="flex flex-col items-center gap-5">
            <motion.span
              className="font-display text-4xl tracking-[0.2em] text-espresso"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: ease.out }}
            >
              {wedding.couple.monogram}
            </motion.span>
            {/* A hairline that fills left to right — honest about being
                indeterminate, rather than faking a percentage. */}
            <div className="h-px w-28 overflow-hidden bg-gold/20">
              <motion.div
                className="h-full w-full bg-gold"
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 1.6, ease: ease.inOut, repeat: Infinity, repeatType: "loop" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Fixed, full-viewport host for the 3D diorama. Sits behind every DOM section at
 * `z-0`; the content scrolls over it.
 */
export function SceneHost() {
  return (
    <>
      <Curtain />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        // The canvas is decorative: everything it depicts is also stated in the
        // DOM copy, so there is nothing here for a screen reader to miss.
        aria-hidden
      >
        <Scene />
      </div>
    </>
  );
}
