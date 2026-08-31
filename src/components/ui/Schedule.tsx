"use client";

/**
 * The running order, split across the two days as a real tab set.
 *
 * Proper `tablist` semantics, not two buttons that look like tabs: roving
 * tabindex, so the group is one stop in the tab order, and left/right/home/end to
 * move between days. That's the pattern screen-reader users expect the moment
 * something is announced as a tab.
 */

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { wedding } from "@/content/wedding";
import { useMotionEnabled } from "@/lib/store";
import { ease, inView, riseIn, stagger } from "@/lib/motion";
import { Chip, Heading, Section, Wrap } from "./primitives";

const days = wedding.schedule;

export function Schedule() {
  const enabled = useMotionEnabled();
  const [day, setDay] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (to: number) => {
    const next = (to + days.length) % days.length;
    setDay(next);
    tabs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, number | undefined> = {
      ArrowRight: day + 1,
      ArrowLeft: day - 1,
      Home: 0,
      End: days.length - 1,
    };
    const to = keys[e.key];
    if (to === undefined) return;
    e.preventDefault();
    move(to);
  };

  return (
    <Section id="schedule" size="tall">
      <Wrap className="flex flex-col gap-14">
        <Heading eyebrow="Two days" title="The running order" id="schedule-title" />

        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label="Wedding days"
            onKeyDown={onKeyDown}
            className="vellum inline-flex rounded-full p-1.5"
          >
            {days.map((d, i) => {
              const selected = i === day;
              return (
                <button
                  key={d.label}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`schedule-tab-${i}`}
                  aria-selected={selected}
                  aria-controls={`schedule-panel-${i}`}
                  // Roving tabindex: only the selected tab is reachable with Tab.
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setDay(i)}
                  className="relative rounded-full px-5 py-2.5 text-sm transition-colors sm:px-7"
                >
                  {selected ? (
                    <motion.span
                      layoutId="schedule-tab"
                      className="absolute inset-0 rounded-full bg-espresso"
                      transition={enabled ? { type: "spring", stiffness: 400, damping: 32 } : { duration: 0 }}
                    />
                  ) : null}
                  <span className={`relative ${selected ? "text-ivory" : "text-muted hover:text-espresso"}`}>
                    <span className="font-medium">{d.label}</span>
                    <span className="ml-2 hidden opacity-70 sm:inline">{d.date}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* `mode="wait"` rather than a crossfade: two overlapping timelines of
            different heights makes the page jump around under the reader. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={day}
            id={`schedule-panel-${day}`}
            role="tabpanel"
            aria-labelledby={`schedule-tab-${day}`}
            tabIndex={0}
            initial={{ opacity: 0, y: enabled ? 16 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: enabled ? -10 : 0 }}
            transition={{ duration: enabled ? 0.4 : 0.15, ease: ease.out }}
            className="vellum rounded-3xl p-6 sm:p-10 focus-visible:outline-none"
          >
            <p className="eyebrow mb-8 text-center sm:hidden">{days[day].date}</p>

            <motion.ol
              className="flex flex-col"
              variants={stagger(enabled, 0.08, 0.1)}
              initial="hidden"
              animate="show"
            >
              {days[day].events.map((event) => (
                <motion.li
                  key={event.title}
                  className="group grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-b border-gold/15 py-7 last:border-b-0 sm:grid-cols-[7.5rem_auto_1fr] sm:gap-x-8"
                  variants={riseIn(enabled, 18)}
                >
                  <p className="font-display text-xl font-medium text-gold-dark sm:text-2xl">{event.time}</p>

                  {/* A short rule per row, only where there's width for it. */}
                  <span aria-hidden className="mt-4 hidden h-px w-full bg-gold/25 sm:block" />

                  <div className="col-span-2 sm:col-span-1">
                    <h3 className="text-title leading-tight text-espresso">{event.title}</h3>
                    <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">{event.body}</p>
                    {event.note ? (
                      <p className="mt-4">
                        <Chip tone="blush">{event.note}</Chip>
                      </p>
                    ) : null}
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          </motion.div>
        </AnimatePresence>

        <motion.p
          className="text-center text-sm text-muted"
          variants={riseIn(enabled, 12)}
          initial="hidden"
          whileInView="show"
          viewport={inView}
        >
          All times {wedding.date.timezoneLabel}. Nothing here is compulsory except the dancing.
        </motion.p>
      </Wrap>
    </Section>
  );
}
