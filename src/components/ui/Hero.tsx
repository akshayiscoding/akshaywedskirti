"use client";

/**
 * The hero. The one screen that has to carry the whole thing, so it does as little
 * as possible: names, date, place, and a reason to scroll.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { wedding } from "@/content/wedding";
import { useMotionEnabled, useSceneStore } from "@/lib/store";
import { ease, maskUp, riseIn, stagger } from "@/lib/motion";

export function Hero() {
  const enabled = useMotionEnabled();
  const ready = useSceneStore((s) => s.ready);

  // Hold the entrance until the diorama has drawn — the words landing on an empty
  // ivory rectangle and the scene appearing underneath them afterwards reads as a
  // page that broke and then recovered.
  const show = ready ? "show" : "hidden";

  return (
    <section id="hero" className="relative flex min-h-screen w-full items-center justify-center px-5 sm:px-8">
      <motion.div
        className="relative flex w-full max-w-6xl flex-col items-center text-center"
        variants={stagger(enabled, 0.12, 0.15)}
        initial="hidden"
        animate={show}
      >
        <motion.p className="eyebrow mb-8 text-shadow-soft" variants={riseIn(enabled, 14)}>
          {wedding.invitation.eyebrow}
        </motion.p>

        {/* Name, one masked word at a time. Splitting on spaces rather than
            characters keeps it readable to a screen reader as a single phrase —
            each word is one element, and the whole heading is one accessible name. */}
        <h1 className="text-hero font-display leading-[0.86] text-espresso text-shadow-soft">
          <span className="sr-only">{wedding.couple.display}</span>
          <span aria-hidden className="flex flex-wrap items-baseline justify-center gap-x-[0.22em]">
            {wedding.couple.display.split(" ").map((word, i) => (
              <span key={`${word}-${i}`} className="clip-line">
                <motion.span className="block" variants={maskUp(enabled, i * 0.06)}>
                  {word === "&" ? <span className="text-gold-dark italic">&amp;</span> : word}
                </motion.span>
              </span>
            ))}
          </span>
        </h1>

        <motion.div
          className="mt-10 flex flex-col items-center gap-4 text-shadow-soft"
          variants={riseIn(enabled, 20, 0.15)}
        >
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="h-px w-8 bg-gold-dark/50 sm:w-14" aria-hidden />
            <p className="text-sm font-medium tracking-[0.28em] uppercase text-espresso sm:text-base">{wedding.date.short}</p>
            <span className="h-px w-8 bg-gold-dark/50 sm:w-14" aria-hidden />
          </div>
          <p className="max-w-md text-sm font-medium leading-relaxed text-muted sm:text-base">
            {wedding.venue.name} · {wedding.venue.addressLines[1]}
          </p>
        </motion.div>

        <motion.div className="mt-12" variants={riseIn(enabled, 20, 0.25)}>
          <Countdown />
        </motion.div>
      </motion.div>

      <ScrollCue visible={ready} />
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Countdown
   ──────────────────────────────────────────────────────────────────────────── */

const TARGET = new Date(wedding.date.iso).getTime();

type Parts = { days: number; hours: number; minutes: number };

function remaining(): Parts {
  const ms = Math.max(0, TARGET - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
  };
}

/**
 * Days / hours / minutes to the ceremony.
 *
 * Starts as `null` and fills in from an effect. The server has no idea what time
 * it is where you are, so rendering a real value during SSR guarantees a
 * hydration mismatch — and this is the first thing on the page, which is the worst
 * possible place for React to throw away the server HTML and start again.
 */
function Countdown() {
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    setParts(remaining());
    const id = window.setInterval(() => setParts(remaining()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const cells: Array<[string, number | null]> = [
    ["days", parts?.days ?? null],
    ["hours", parts?.hours ?? null],
    ["minutes", parts?.minutes ?? null],
  ];

  return (
    <div className="vellum flex items-stretch divide-x divide-gold/18 rounded-2xl px-2 py-3 sm:px-4">
      {cells.map(([label, value]) => (
        <div key={label} className="flex min-w-[5.5rem] flex-col items-center gap-1 px-4 sm:min-w-[6.5rem]">
          <span className="font-display text-3xl leading-none text-espresso tabular-nums sm:text-4xl">
            {value === null ? "—" : String(value).padStart(2, "0")}
          </span>
          <span className="eyebrow text-[0.68rem]">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Scroll cue
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * The nudge. Worth having because the entire page is one scroll gesture and the
 * hero gives no other hint that there's anything below it.
 */
function ScrollCue({ visible }: { visible: boolean }) {
  const enabled = useMotionEnabled();

  return (
    <motion.div
      className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.8, delay: 1.4, ease: ease.out }}
      aria-hidden
    >
      <span className="eyebrow rounded-full border border-gold/30 bg-ivory/90 px-3 py-1 text-[0.7rem] font-semibold text-espresso shadow-xs backdrop-blur-sm">Scroll</span>
      <span className="relative block h-12 w-px overflow-hidden bg-gold/35">
        <motion.span
          className="absolute inset-x-0 top-0 block h-4 bg-gold"
          animate={enabled ? { y: [-16, 48] } : { y: 16 }}
          transition={
            enabled ? { duration: 2.1, repeat: Infinity, ease: [0.65, 0, 0.35, 1] } : { duration: 0 }
          }
        />
      </span>
    </motion.div>
  );
}
