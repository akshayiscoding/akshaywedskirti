"use client";

/**
 * The last thing on the page.
 *
 * Solid rather than translucent — the diorama has been visible behind every
 * section above, and letting it stop here is what makes the page feel like it has
 * an end rather than just running out of content.
 */

import { motion } from "framer-motion";

import { wedding } from "@/content/wedding";
import { useMotionEnabled } from "@/lib/store";
import { fadeIn, inView, riseIn, stagger } from "@/lib/motion";

const { couple, date, venue, sections, footer } = wedding;

export function Footer() {
  const enabled = useMotionEnabled();

  return (
    <footer className="relative z-10 mt-24 border-t border-gold/20 bg-espresso px-5 py-20 text-ivory sm:px-8 sm:py-24">
      <motion.div
        className="mx-auto flex w-full max-w-5xl flex-col gap-16"
        variants={stagger(enabled, 0.08)}
        initial="hidden"
        whileInView="show"
        viewport={inView}
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <motion.span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/45 font-display text-lg text-gold-pale"
            variants={riseIn(enabled, 18)}
          >
            {couple.monogram}
          </motion.span>

          <motion.p className="font-display text-3xl leading-tight sm:text-4xl" variants={riseIn(enabled, 22)}>
            {couple.display}
          </motion.p>

          <motion.p className="text-sm font-medium tracking-[0.28em] text-ivory/80 uppercase" variants={fadeIn(enabled)}>
            {date.short} · {venue.name}
          </motion.p>
        </div>

        {/* A second route to every section. Someone who has read to the bottom
            shouldn't have to scroll all the way back up to act on it. */}
        <motion.nav aria-label="Sections" variants={fadeIn(enabled)}>
          <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-xs font-medium tracking-[0.16em] text-ivory/80 uppercase transition-colors hover:text-gold-pale"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </motion.nav>

        <motion.div
          className="flex flex-col items-center gap-4 border-t border-ivory/12 pt-10 text-center"
          variants={fadeIn(enabled)}
        >
          <p className="text-base text-ivory/90">{footer.note}</p>

          <p className="font-display text-xl text-gold-pale">{couple.hashtag}</p>

          <p className="mt-2 text-[0.72rem] font-medium leading-relaxed tracking-wide text-ivory/70">{footer.credit}</p>
        </motion.div>
      </motion.div>
    </footer>
  );
}
