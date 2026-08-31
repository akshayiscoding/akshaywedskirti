"use client";

/**
 * Everything else, as an accordion.
 *
 * Native disclosure semantics: a real `<button>` per question with
 * `aria-expanded` and `aria-controls`, and the answer in a region that points back
 * at its trigger. That gets you Enter/Space, screen-reader announcement of the
 * state, and browser find-in-page — none of which a `<div onClick>` provides.
 *
 * Not `<details>`, because the height animation needs the element to stay mounted
 * and measurable, and `<details>` gives no hook for that.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { wedding } from "@/content/wedding";
import { useMotionEnabled } from "@/lib/store";
import { accordion, ease, inView, riseIn, stagger } from "@/lib/motion";
import { Heading, Section, Wrap } from "./primitives";

export function Faq() {
  const enabled = useMotionEnabled();
  // Single-open. A page-worth of expanded answers is worse than a second click.
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section id="faq" size="tall">
      <Wrap className="flex max-w-3xl flex-col gap-14">
        <Heading eyebrow="The practical bits" title="Details & questions" id="faq-title" />

        <motion.ul
          className="vellum flex flex-col rounded-3xl p-6 sm:p-10"
          variants={stagger(enabled, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={inView}
        >
          {wedding.faq.map((item, i) => {
            const expanded = open === i;
            return (
              <motion.li key={item.q} className="border-b border-gold/15 last:border-b-0" variants={riseIn(enabled, 16)}>
                <h3>
                  <button
                    type="button"
                    id={`faq-trigger-${i}`}
                    aria-expanded={expanded}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(expanded ? null : i)}
                    className="flex w-full items-start justify-between gap-6 py-6 text-left"
                  >
                    <span
                      className={`text-lg font-medium leading-snug transition-colors sm:text-xl ${
                        expanded ? "text-espresso" : "text-ink hover:text-espresso"
                      }`}
                    >
                      {item.q}
                    </span>

                    {/* A plus that becomes a minus. Two spans rather than an icon
                        swap, so the transition is continuous. */}
                    <span
                      aria-hidden
                      className="relative mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center"
                    >
                      <span className="absolute h-px w-4 bg-gold-dark" />
                      <motion.span
                        className="absolute h-4 w-px bg-gold-dark"
                        animate={{ rotate: expanded ? 90 : 0, opacity: expanded ? 0 : 1 }}
                        transition={{ duration: enabled ? 0.32 : 0, ease: ease.inOut }}
                      />
                    </span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      id={`faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${i}`}
                      // `overflow-hidden` is load-bearing: the height variant
                      // animates to "auto", and without it the text spills out of
                      // the collapsing box.
                      className="overflow-hidden"
                      variants={accordion}
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                    >
                      <p className="pb-7 pr-6 text-base leading-relaxed text-muted sm:pr-10">{item.a}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </motion.ul>

        <p className="text-center text-sm text-muted">
          Anything else at all —{" "}
          <a href={`mailto:${wedding.rsvp.email}`} className="link-underline text-espresso">
            {wedding.rsvp.email}
          </a>{" "}
          or{" "}
          <a href={`tel:${wedding.rsvp.phone.replace(/\s/g, "")}`} className="link-underline text-espresso">
            {wedding.rsvp.phone}
          </a>
          .
        </p>
      </Wrap>
    </Section>
  );
}
