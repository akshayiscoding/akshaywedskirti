"use client";

/**
 * Shared layout and reveal primitives.
 *
 * Two things every section needs and must not get wrong:
 *
 *  1. The `<section>` element carries an `id` from `wedding.sections`. ScrollDriver
 *     measures those elements by id to work out where the camera should be — a
 *     mismatch here silently unhooks the 3D flight from the scroll.
 *  2. Reveals degrade to opacity-only when motion is off, via `useMotionEnabled`.
 */

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import type { SectionId } from "@/content/wedding";
import { useMotionEnabled } from "@/lib/store";
import { fadeIn, inView, riseIn, stagger } from "@/lib/motion";

export function Section({
  id,
  children,
  className = "",
  /** Vertical rhythm. `tall` gives the camera more scroll to fly through. */
  size = "base",
}: {
  id: SectionId;
  children: ReactNode;
  className?: string;
  size?: "base" | "tall" | "screen";
}) {
  const pad =
    size === "screen"
      ? "min-h-screen py-24"
      : size === "tall"
        ? "min-h-[130vh] py-32 sm:py-40"
        : "min-h-[85vh] py-24 sm:py-32";

  return (
    <section id={id} className={`relative flex w-full flex-col justify-center px-5 sm:px-8 ${pad} ${className}`}>
      {children}
    </section>
  );
}

/** Constrains a column of copy to a comfortable measure. */
export function Wrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-5xl ${className}`}>{children}</div>;
}

/**
 * Fades a block in as it enters the viewport. `once` by default — a reveal that
 * replays every time you scroll past turns into a nervous tic on a long page.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 28,
  as = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  as?: "div" | "li" | "p";
  className?: string;
}) {
  const enabled = useMotionEnabled();
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      variants={riseIn(enabled, distance, delay)}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      {children}
    </Tag>
  );
}

/** A parent that releases its children in sequence. Children use `<Child>`. */
export function Cascade({
  children,
  className = "",
  each = 0.09,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  each?: number;
  as?: "div" | "ul" | "ol";
}) {
  const enabled = useMotionEnabled();
  const Tag = motion[as];

  return (
    <Tag className={className} variants={stagger(enabled, each)} initial="hidden" whileInView="show" viewport={inView}>
      {children}
    </Tag>
  );
}

/** A member of a `<Cascade>`. Inherits the parent's timing. */
export function Child({
  children,
  className = "",
  as = "div",
  distance = 24,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
  distance?: number;
}) {
  const enabled = useMotionEnabled();
  const Tag = motion[as];
  return (
    <Tag className={className} variants={riseIn(enabled, distance)}>
      {children}
    </Tag>
  );
}

/** Eyebrow + title + hairline, the header every section shares. */
export function Heading({
  eyebrow,
  title,
  lead,
  align = "center",
  id,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  align?: "center" | "left";
  id?: string;
}) {
  const enabled = useMotionEnabled();
  const alignment = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <motion.header
      className={`flex flex-col gap-5 ${alignment}`}
      variants={stagger(enabled, 0.08)}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      <motion.p className="eyebrow" variants={fadeIn(enabled)}>
        {eyebrow}
      </motion.p>

      <motion.h2 id={id} className="text-display leading-[0.98] text-espresso" variants={riseIn(enabled, 22)}>
        {title}
      </motion.h2>

      <motion.div
        className="rule w-full max-w-[16rem]"
        variants={{
          hidden: { opacity: 0, scaleX: enabled ? 0.2 : 1 },
          show: { opacity: 1, scaleX: 1, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
        }}
      />

      {lead ? (
        <motion.p
          className={`max-w-2xl text-base leading-relaxed text-muted sm:text-lg ${align === "center" ? "" : "mx-0"}`}
          variants={riseIn(enabled, 18)}
        >
          {lead}
        </motion.p>
      ) : null}
    </motion.header>
  );
}

/** Small pill for dress codes, distances, notes. */
export function Chip({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "blush" | "leaf" }) {
  const tones = {
    gold: "border-gold/40 bg-gold/10 text-espresso",
    blush: "border-rose/45 bg-blush/25 text-espresso",
    leaf: "border-leaf/40 bg-leaf/12 text-espresso",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.7rem] font-medium tracking-[0.12em] uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
