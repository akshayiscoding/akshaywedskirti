"use client";

/**
 * Fixed chrome: monogram, section jump links, the motion toggle, and the RSVP
 * button. Also carries the skip link, because it's the first focusable thing on
 * the page and a visitor who tabs in should be able to reach the form in one hop
 * rather than nine.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { wedding } from "@/content/wedding";
import type { SectionId } from "@/content/wedding";
import { useMotionEnabled, useSceneStore } from "@/lib/store";
import { ease, transition } from "@/lib/motion";

/** Jump to a section, honouring the visitor's motion preference. */
function jumpTo(id: SectionId, smooth: boolean) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}

export function Nav() {
  const active = useSceneStore((s) => s.active);
  const menuOpen = useSceneStore((s) => s.menuOpen);
  const setMenuOpen = useSceneStore((s) => s.setMenuOpen);
  const motionEnabled = useMotionEnabled();

  // Only condense the bar once the hero is behind you.
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the sheet, and while it's open the page shouldn't scroll behind it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [menuOpen, setMenuOpen]);

  const go = (id: SectionId) => {
    setMenuOpen(false);
    jumpTo(id, motionEnabled);
  };

  return (
    <>
      <a
        href="#rsvp"
        className="sr-only-focusable fixed top-4 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gold/40 bg-ivory px-5 py-2.5 text-sm font-medium text-espresso shadow-lg"
        onClick={(e) => {
          e.preventDefault();
          jumpTo("rsvp", motionEnabled);
        }}
      >
        Skip to the RSVP form
      </a>

      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        initial={{ y: motionEnabled ? -24 : 0, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...transition.slow, delay: 0.9 }}
      >
        <div
          className={`flex items-center justify-between gap-4 px-5 transition-all duration-500 sm:px-8 ${
            condensed
              ? "border-b border-gold/20 bg-ivory/92 py-3 shadow-xs backdrop-blur-xl"
              : "border-b border-transparent py-5"
          }`}
        >
          <button
            type="button"
            onClick={() => go("hero")}
            className="font-display text-xl font-bold leading-none text-espresso transition-opacity hover:opacity-75"
            aria-label={`${wedding.couple.display} — back to the top`}
          >
            {wedding.couple.monogram}
          </button>

          <nav aria-label="Sections" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {wedding.sections.map((s) => {
                const current = active === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => go(s.id)}
                      aria-current={current ? "true" : undefined}
                      className="relative rounded-full px-3.5 py-2 text-[0.8rem] tracking-wide transition-colors"
                    >
                      {/* The pill slides between items rather than fading in and
                          out, so the eye tracks where it went. */}
                      {current ? (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-full bg-blush/60"
                          transition={
                            motionEnabled ? { type: "spring", stiffness: 420, damping: 34 } : { duration: 0 }
                          }
                        />
                      ) : null}
                      <span className={`relative ${current ? "font-semibold text-espresso" : "font-medium text-muted hover:text-espresso"}`}>
                        {s.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <MotionToggle />

            <button
              type="button"
              onClick={() => go("rsvp")}
              className="hidden rounded-full bg-espresso px-5 py-2.5 text-[0.8rem] font-medium tracking-wide text-ivory transition-transform hover:-translate-y-0.5 sm:block"
            >
              RSVP
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="nav-sheet"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 lg:hidden"
            >
              <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
              <span className="relative block h-3 w-4">
                <motion.span
                  className="absolute inset-x-0 top-0 h-px bg-espresso"
                  animate={menuOpen ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }}
                  transition={{ duration: motionEnabled ? 0.28 : 0, ease: ease.out }}
                />
                <motion.span
                  className="absolute inset-x-0 bottom-0 h-px bg-espresso"
                  animate={menuOpen ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }}
                  transition={{ duration: motionEnabled ? 0.28 : 0, ease: ease.out }}
                />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="nav-sheet"
            className="fixed inset-0 z-40 flex flex-col justify-center bg-ivory/97 px-8 backdrop-blur-2xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionEnabled ? 0.3 : 0, ease: ease.out }}
          >
            <nav aria-label="Sections">
              <ul className="flex flex-col gap-1">
                {wedding.sections.map((s, i) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, x: motionEnabled ? -18 : 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: motionEnabled ? 0.05 + i * 0.045 : 0, ...transition.base }}
                  >
                    <button
                      type="button"
                      onClick={() => go(s.id)}
                      className="flex w-full items-baseline gap-4 border-b border-gold/12 py-4 text-left"
                    >
                      <span className="eyebrow w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      <span
                        className={`font-display text-3xl ${active === s.id ? "text-espresso" : "text-muted"}`}
                      >
                        {s.label}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/**
 * Motion toggle.
 *
 * Three states matter, not two: "following your system setting", "on anyway", and
 * "off anyway". The store models that as `boolean | null`, and this cycles
 * between the two explicit states while showing which one is in force — someone
 * who gets motion sickness needs the off switch to be visible, not buried.
 */
function MotionToggle() {
  const enabled = useMotionEnabled();
  const setOverride = useSceneStore((s) => s.setMotionOverride);

  return (
    <button
      type="button"
      onClick={() => setOverride(!enabled)}
      aria-pressed={enabled}
      className="flex h-10 items-center gap-2 rounded-full border border-gold/30 px-3 text-[0.7rem] tracking-[0.12em] uppercase text-muted transition-colors hover:text-espresso"
      title={enabled ? "Turn off animation" : "Turn on animation"}
    >
      <span
        aria-hidden
        className={`block h-1.5 w-1.5 rounded-full transition-colors ${enabled ? "bg-leaf" : "bg-rose"}`}
      />
      <span className="hidden sm:inline">Motion</span>
      <span className="sr-only">{enabled ? "Animation is on. Turn it off." : "Animation is off. Turn it on."}</span>
    </button>
  );
}
