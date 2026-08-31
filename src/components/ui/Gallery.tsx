"use client";

/**
 * Photographs, with a lightbox.
 *
 * The accessibility here is the substance of the component, not a coat of paint:
 *
 *  - Tiles are `<button>`s. A clickable `<div>` can't be reached by keyboard and
 *    isn't announced as actionable.
 *  - Opening the lightbox moves focus into it and closing returns focus to the
 *    tile you came from, so a keyboard user doesn't get dumped back at the top of
 *    the document.
 *  - Tab is trapped inside the dialog while it's open, Escape closes, and
 *    left/right move between images.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { wedding } from "@/content/wedding";
import { useMotionEnabled } from "@/lib/store";
import { ease } from "@/lib/motion";
import { Cascade, Child, Heading, Section, Wrap } from "./primitives";

const items = wedding.gallery;

/** Masonry spans. `tall` takes two rows, `wide` two columns. */
const SPAN = {
  tall: "sm:row-span-2",
  wide: "sm:col-span-2",
  square: "",
} as const;

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  // The tile that opened the dialog, so focus can go back exactly where it was.
  const opener = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(null);
    opener.current?.focus();
  }, []);

  return (
    <Section id="gallery" size="tall">
      <Wrap className="flex flex-col gap-14">
        <Heading eyebrow="A few from before" title="The grove, mostly" id="gallery-title" />

        <Cascade
          className="grid auto-rows-[13rem] grid-cols-1 gap-4 sm:grid-cols-3 sm:auto-rows-[11rem] lg:auto-rows-[13rem]"
          each={0.07}
        >
          {items.map((item, i) => (
            <Child key={item.src} className={SPAN[item.span ?? "square"]}>
              <button
                type="button"
                onClick={(e) => {
                  opener.current = e.currentTarget;
                  setOpen(i);
                }}
                className="group relative block h-full w-full overflow-hidden rounded-2xl border border-gold/20 bg-paper text-left"
                aria-label={`Open photograph: ${item.alt}`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  // The bundled placeholders are SVG, which the image optimizer
                  // refuses by default; real photographs can drop this prop.
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                />
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/90 via-espresso/50 to-transparent p-4 pt-10 text-xs font-medium tracking-wide text-ivory opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {item.caption}
                </span>
              </button>
            </Child>
          ))}
        </Cascade>

        <p className="text-center text-sm font-medium text-muted">
          Everything from the day itself will land here afterwards — tag yours{" "}
          <span className="font-semibold text-espresso">{wedding.couple.hashtag}</span>.
        </p>
      </Wrap>

      <AnimatePresence>
        {open !== null ? <Lightbox index={open} onClose={close} onMove={setOpen} /> : null}
      </AnimatePresence>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Lightbox
   ──────────────────────────────────────────────────────────────────────────── */

function Lightbox({
  index,
  onClose,
  onMove,
}: {
  index: number;
  onClose: () => void;
  onMove: (i: number) => void;
}) {
  const enabled = useMotionEnabled();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const item = items[index];

  // Move focus in on open. Without this the dialog is visually modal but the
  // keyboard is still down in the page behind it.
  useEffect(() => {
    closeButton.current?.focus();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        onMove((index + 1) % items.length);
        return;
      }
      if (e.key === "ArrowLeft") {
        onMove((index - 1 + items.length) % items.length);
        return;
      }
      if (e.key !== "Tab") return;

      // Focus trap. Only three controls in here, so querying them per keystroke
      // is cheaper and more robust than caching a list that goes stale on
      // navigation.
      const focusable = panel.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, onClose, onMove]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-espresso/88 p-4 backdrop-blur-md sm:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: enabled ? 0.28 : 0, ease: ease.out }}
      role="dialog"
      aria-modal="true"
      aria-label={`Photograph ${index + 1} of ${items.length}: ${item.alt}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panel}
        className="relative flex w-full max-w-4xl flex-col gap-4"
        initial={{ scale: enabled ? 0.96 : 1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: enabled ? 0.97 : 1, opacity: 0 }}
        transition={{ duration: enabled ? 0.34 : 0, ease: ease.out }}
      >
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-paper">
          <Image src={item.src} alt={item.alt} fill unoptimized sizes="90vw" className="object-cover" priority />
        </div>

        <div className="flex items-center justify-between gap-4 text-ivory">
          <p className="text-sm">
            <span className="tabular-nums font-medium opacity-85">
              {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </span>
            <span className="ml-4">{item.caption}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMove((index - 1 + items.length) % items.length)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ivory/25 transition-colors hover:bg-ivory/12"
            >
              <span aria-hidden>←</span>
              <span className="sr-only">Previous photograph</span>
            </button>
            <button
              type="button"
              onClick={() => onMove((index + 1) % items.length)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ivory/25 transition-colors hover:bg-ivory/12"
            >
              <span aria-hidden>→</span>
              <span className="sr-only">Next photograph</span>
            </button>
            <button
              ref={closeButton}
              type="button"
              onClick={onClose}
              className="flex h-11 items-center gap-2 rounded-full border border-ivory/25 px-5 text-sm transition-colors hover:bg-ivory/12"
            >
              Close
              <span aria-hidden>✕</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
