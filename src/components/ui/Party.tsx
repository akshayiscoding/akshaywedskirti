"use client";

/**
 * The wedding party. Paper-cut initials rather than photographs — the point of the
 * section is who these people are to us, and six cropped headshots would fight
 * the diorama behind them.
 */

import { motion } from "framer-motion";

import { wedding } from "@/content/wedding";
import { useMotionEnabled } from "@/lib/store";
import { inView, riseIn, stagger } from "@/lib/motion";
import { Heading, Section, Wrap } from "./primitives";

export function Party() {
  const enabled = useMotionEnabled();

  return (
    <Section id="party" size="tall">
      <Wrap className="flex flex-col gap-14">
        <Heading
          eyebrow="On our side"
          title="The people holding this together"
          lead="Find them on the day. They know where everything is, and at least two of them have a spare safety pin."
          id="party-title"
        />

        <motion.ul
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          variants={stagger(enabled, 0.08)}
          initial="hidden"
          whileInView="show"
          viewport={inView}
        >
          {wedding.party.map((person) => (
            <motion.li
              key={person.name}
              className="vellum group flex flex-col gap-5 rounded-2xl p-7"
              variants={riseIn(enabled, 26)}
            >
              <span
                aria-hidden
                className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/35 bg-blush/30 font-display text-xl text-espresso transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:-rotate-6"
              >
                {person.initials}
              </span>

              <div>
                <h3 className="text-title leading-tight text-espresso">{person.name}</h3>
                <p className="eyebrow mt-2 text-[0.7rem] font-semibold">{person.role}</p>
              </div>

              <p className="text-sm leading-relaxed text-muted">{person.blurb}</p>
            </motion.li>
          ))}
        </motion.ul>
      </Wrap>
    </Section>
  );
}
