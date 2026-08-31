"use client";

/**
 * The invitation proper — a single vellum card, held to the middle of the screen
 * while the camera settles on the arch behind it.
 */

import { motion } from "framer-motion";

import { wedding } from "@/content/wedding";
import { useMotionEnabled } from "@/lib/store";
import { fadeIn, inView, riseIn, scaleIn, stagger } from "@/lib/motion";
import { Section } from "./primitives";

export function Invitation() {
  const enabled = useMotionEnabled();
  const { invitation, couple, date, venue } = wedding;

  return (
    <Section id="invitation" size="tall">
      <motion.div
        className="mx-auto w-full max-w-2xl"
        variants={scaleIn(enabled, 0.965)}
        initial="hidden"
        whileInView="show"
        viewport={inView}
      >
        <motion.article
          className="vellum torn-bottom relative rounded-t-3xl px-7 pt-14 pb-20 text-center sm:px-14 sm:pt-20 sm:pb-28"
          variants={stagger(enabled, 0.1, 0.2)}
        >
          {/* Corner rules, drawn rather than bordered so only the corners show. */}
          {(
            [
              "top-5 left-5 border-t border-l",
              "top-5 right-5 border-t border-r",
              "bottom-9 left-5 border-b border-l",
              "bottom-9 right-5 border-b border-r",
            ] as const
          ).map((cls) => (
            <span key={cls} className={`pointer-events-none absolute h-7 w-7 border-gold/35 ${cls}`} aria-hidden />
          ))}

          <motion.p className="eyebrow" variants={fadeIn(enabled)}>
            {invitation.eyebrow}
          </motion.p>

          <motion.p className="mt-7 text-base leading-relaxed text-muted sm:text-lg" variants={riseIn(enabled, 16)}>
            {invitation.lead}
          </motion.p>

          <motion.h2
            className="mt-8 font-display text-[clamp(2.1rem,7vw,4rem)] leading-[0.95] text-espresso"
            variants={riseIn(enabled, 22)}
          >
            {couple.partnerA.first} {couple.partnerA.last}
            <span className="mx-3 text-gold-dark italic">&amp;</span>
            <br className="hidden sm:block" />
            {couple.partnerB.first} {couple.partnerB.last}
          </motion.h2>

          <motion.p className="mx-auto mt-8 max-w-lg text-base leading-relaxed text-ink" variants={riseIn(enabled, 16)}>
            {invitation.body}
          </motion.p>

          <motion.div className="mt-10 flex flex-col items-center gap-2" variants={riseIn(enabled, 16)}>
            <div className="rule w-40" />
            <p className="mt-5 font-display text-2xl text-espresso">{date.long}</p>
            <p className="text-sm font-medium tracking-[0.2em] uppercase text-muted">
              {date.time} · {date.timezoneLabel}
            </p>
            <p className="mt-4 text-sm text-muted">
              {venue.name}, {venue.addressLines[1]}
            </p>
          </motion.div>

          <motion.p className="mt-10 text-[0.82rem] font-semibold tracking-[0.2em] uppercase text-rose-deep" variants={fadeIn(enabled)}>
            Kindly reply by {invitation.rsvpBy}
          </motion.p>
        </motion.article>
      </motion.div>
    </Section>
  );
}
