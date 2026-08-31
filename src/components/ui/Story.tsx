"use client";

/**
 * Our Story — an alternating timeline. Five beats, so it's long enough to give the
 * camera a proper run down the aisle and short enough that nobody skims it.
 */

import { motion } from "framer-motion";

import { wedding } from "@/content/wedding";
import { useMotionEnabled } from "@/lib/store";
import { fadeIn, inView, riseIn, slideIn } from "@/lib/motion";
import { Heading, Section, Wrap } from "./primitives";

export function Story() {
  return (
    <Section id="story" size="tall">
      <Wrap className="flex flex-col gap-16 sm:gap-24">
        <Heading eyebrow="How we got here" title="Our story" id="story-title" />

        <ol className="relative flex flex-col gap-14 sm:gap-20">
          {/* The spine. Left-aligned on narrow screens, centred once there's room
              for beats either side of it. */}
          <span
            aria-hidden
            className="absolute top-2 bottom-2 left-[0.4375rem] w-px bg-gradient-to-b from-transparent via-gold/35 to-transparent sm:left-1/2 sm:-translate-x-1/2"
          />

          {wedding.story.map((beat, i) => (
            <Beat key={beat.year} beat={beat} side={i % 2 === 0 ? "left" : "right"} />
          ))}
        </ol>
      </Wrap>
    </Section>
  );
}

function Beat({
  beat,
  side,
}: {
  beat: (typeof wedding.story)[number];
  side: "left" | "right";
}) {
  const enabled = useMotionEnabled();

  return (
    <motion.li
      className={`relative pl-10 sm:w-1/2 sm:pl-0 ${side === "left" ? "sm:self-start sm:pr-14 sm:text-right" : "sm:self-end sm:pl-14"
        }`}
      variants={slideIn(enabled, side)}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      {/* The node on the spine. */}
      <motion.span
        aria-hidden
        className={`absolute top-6 left-0 z-10 block h-3.5 w-3.5 rounded-full border border-gold/60 bg-ivory sm:top-7 ${side === "left" ? "sm:right-[-0.4375rem] sm:left-auto" : "sm:left-[-0.4375rem]"
          }`}
        variants={{
          hidden: { scale: enabled ? 0 : 1, opacity: 0 },
          show: { scale: 1, opacity: 1, transition: { duration: 0.5, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] } },
        }}
      >
        <span className="absolute inset-[0.28rem] rounded-full bg-gold" />
      </motion.span>

      <div className="vellum rounded-2xl p-6 sm:p-8">
        <motion.p className="font-display text-4xl leading-none text-gold-dark font-medium sm:text-5xl" variants={fadeIn(enabled)}>
          {beat.year}
        </motion.p>

        <motion.h3 className="mt-4 text-title leading-tight text-espresso" variants={riseIn(enabled, 14)}>
          {beat.title}
        </motion.h3>

        {beat.place ? (
          <motion.p className="eyebrow mt-2" variants={fadeIn(enabled)}>
            {beat.place}
          </motion.p>
        ) : null}

        <motion.p className="mt-4 text-base leading-relaxed text-muted" variants={riseIn(enabled, 14)}>
          {beat.body}
        </motion.p>
      </div>
    </motion.li>
  );
}
