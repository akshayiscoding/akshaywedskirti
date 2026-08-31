"use client";

/**
 * The RSVP form.
 *
 * Errors appear on blur and on submit, never on first keystroke — telling someone
 * their email is invalid while they're still typing the local part is the most
 * common way to make a form feel hostile.
 */

import { cloneElement, isValidElement, useId, useRef, useState } from "react";
import type { FormEvent, HTMLAttributes, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { wedding } from "@/content/wedding";
import { useMotionEnabled } from "@/lib/store";
import { ease, riseIn } from "@/lib/motion";
import { emptyRsvp, hasErrors, validateRsvp, type RsvpErrors, type RsvpInput } from "@/lib/rsvp";
import { Heading, Section, Wrap } from "./primitives";

type Status = "idle" | "sending" | "sent" | "failed";

export function Rsvp() {
  const enabled = useMotionEnabled();
  const uid = useId();
  const [form, setForm] = useState<RsvpInput>(emptyRsvp);
  const [errors, setErrors] = useState<RsvpErrors>({});
  const [touched, setTouched] = useState<Set<keyof RsvpInput>>(new Set());
  const [status, setStatus] = useState<Status>("idle");
  const summary = useRef<HTMLDivElement>(null);

  const set = <K extends keyof RsvpInput>(key: K, value: RsvpInput[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    // Re-validate live only for fields already blurred, so corrections clear
    // immediately without pre-emptively nagging.
    if (touched.has(key)) setErrors(validateRsvp(next));
  };

  const blur = (key: keyof RsvpInput) => {
    setTouched((prev) => new Set(prev).add(key));
    setErrors(validateRsvp(form));
  };

  const showError = (key: keyof RsvpInput) => (touched.has(key) ? errors[key] : undefined);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const found = validateRsvp(form);
    setErrors(found);
    setTouched(new Set(Object.keys(form) as Array<keyof RsvpInput>));

    if (hasErrors(found)) {
      // Move the reader to the error summary rather than leaving them at a submit
      // button that appeared to do nothing.
      summary.current?.focus();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  const id = (field: string) => `${uid}-${field}`;

  return (
    <Section id="rsvp" size="tall">
      <Wrap className="flex max-w-3xl flex-col gap-12">
        <Heading
          eyebrow={`Kindly reply by ${wedding.rsvp.deadline}`}
          title="Will you come?"
          lead="One form per invitation. If anything changes later, just email — we'd much rather know."
          id="rsvp-title"
        />

        <AnimatePresence mode="wait">
          {status === "sent" ? (
            <motion.div
              key="sent"
              className="vellum flex flex-col items-center gap-5 rounded-3xl px-8 py-16 text-center"
              initial={{ opacity: 0, y: enabled ? 20 : 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: enabled ? 0.5 : 0.15, ease: ease.out }}
              role="status"
            >
              <span aria-hidden className="font-display text-5xl text-gold">
                {wedding.couple.monogram}
              </span>
              <h3 className="text-display leading-tight text-espresso">
                {form.attending === "yes" ? "Wonderful." : "Thank you for telling us."}
              </h3>
              <p className="max-w-md text-base leading-relaxed text-muted">
                {form.attending === "yes"
                  ? `We've got you down${form.partySize > 1 ? ` for ${form.partySize}` : ""}. Everything you need will land in your inbox nearer the time.`
                  : "We'll miss you, and we're glad you let us know. There'll be photographs."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setForm(emptyRsvp);
                  setErrors({});
                  setTouched(new Set());
                  setStatus("idle");
                }}
                className="mt-2 text-sm text-muted link-underline"
              >
                Send another reply
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={onSubmit}
              noValidate
              className="vellum flex flex-col gap-8 rounded-3xl p-7 sm:p-11"
              variants={riseIn(enabled, 24)}
              initial="hidden"
              animate="show"
            >
              {/* Error summary. `tabIndex={-1}` so it can be focused
                  programmatically without becoming a tab stop. */}
              <div
                ref={summary}
                tabIndex={-1}
                role={hasErrors(errors) && touched.size > 3 ? "alert" : undefined}
                className="focus-visible:outline-none"
              >
                {hasErrors(errors) && touched.size > 3 ? (
                  <p className="rounded-xl border border-rose-deep/40 bg-blush/25 px-5 py-4 text-sm text-espresso">
                    A few things need a second look before we can send this.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  id={id("name")}
                  label="Your name"
                  error={showError("name")}
                  hint="As you'd like it on the place card."
                >
                  <input
                    id={id("name")}
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    onBlur={() => blur("name")}
                    className={inputClass(!!showError("name"))}
                  />
                </Field>

                <Field id={id("email")} label="Email" error={showError("email")}>
                  <input
                    id={id("email")}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    onBlur={() => blur("email")}
                    className={inputClass(!!showError("email"))}
                  />
                </Field>
              </div>

              {/* A radio group, not a select: two mutually exclusive options should
                  both be visible, and this is the question the whole form exists
                  to ask. */}
              <fieldset>
                <legend className="eyebrow mb-4">Are you able to come?</legend>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {(
                    [
                      { value: "yes", label: "Joyfully accepts", sub: "We'll be there" },
                      { value: "no", label: "Regretfully declines", sub: "We can't make it" },
                    ] as const
                  ).map((option) => {
                    const selected = form.attending === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex flex-1 cursor-pointer items-start gap-4 rounded-2xl border px-5 py-4 transition-colors ${
                          selected ? "border-gold/60 bg-blush/25" : "border-gold/20 hover:border-gold/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="attending"
                          value={option.value}
                          checked={selected}
                          onChange={() => {
                            const next = { ...form, attending: option.value };
                            setForm(next);
                            setTouched((prev) => new Set(prev).add("attending"));
                            setErrors(validateRsvp(next));
                          }}
                          className="mt-1 h-4 w-4 accent-[var(--color-gold)]"
                        />
                        <span>
                          <span className="block font-display text-lg text-espresso">{option.label}</span>
                          <span className="block text-sm text-muted">{option.sub}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {showError("attending") ? <FieldError>{errors.attending}</FieldError> : null}
              </fieldset>

              {/* Everything below only exists if you're coming. Collapsed rather
                  than disabled — a wall of greyed-out inputs is noise for someone
                  who just declined. */}
              <AnimatePresence initial={false}>
                {form.attending === "yes" ? (
                  <motion.div
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: enabled ? 0.42 : 0, ease: ease.out }}
                  >
                    <div className="flex flex-col gap-6 pt-2">
                      <div className="grid gap-6 sm:grid-cols-[10rem_1fr]">
                        <Field id={id("partySize")} label="How many of you" error={showError("partySize")}>
                          <select
                            id={id("partySize")}
                            name="partySize"
                            value={form.partySize}
                            onChange={(e) => set("partySize", Number(e.target.value))}
                            onBlur={() => blur("partySize")}
                            className={inputClass(!!showError("partySize"))}
                          >
                            {Array.from({ length: wedding.rsvp.maxParty }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>
                                {n} {n === 1 ? "person" : "people"}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field
                          id={id("guests")}
                          label="Who's coming with you"
                          error={showError("guests")}
                          hint="One name per person, including children and their ages."
                        >
                          <input
                            id={id("guests")}
                            name="guests"
                            type="text"
                            value={form.guests}
                            onChange={(e) => set("guests", e.target.value)}
                            onBlur={() => blur("guests")}
                            className={inputClass(!!showError("guests"))}
                          />
                        </Field>
                      </div>

                      <Field
                        id={id("dietary")}
                        label="Anything the kitchen should know"
                        error={showError("dietary")}
                        hint="Allergies, Jain, vegan, gluten-free — the more specific, the better the food."
                      >
                        <textarea
                          id={id("dietary")}
                          name="dietary"
                          rows={3}
                          value={form.dietary}
                          onChange={(e) => set("dietary", e.target.value)}
                          onBlur={() => blur("dietary")}
                          className={`${inputClass(!!showError("dietary"))} resize-y`}
                        />
                      </Field>

                      <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-gold/20 px-5 py-4">
                        <input
                          type="checkbox"
                          name="shuttle"
                          checked={form.shuttle}
                          onChange={(e) => set("shuttle", e.target.checked)}
                          className="mt-1 h-4 w-4 accent-[var(--color-gold)]"
                        />
                        <span>
                          <span className="block text-base text-espresso">Hold me a seat on the coach</span>
                          <span className="block text-sm text-muted">
                            Nashik city centre at 2:00 pm, back at 1:00 am. Free, and much easier than driving.
                          </span>
                        </span>
                      </label>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <Field id={id("message")} label="A note for us" error={showError("message")} optional>
                <textarea
                  id={id("message")}
                  name="message"
                  rows={3}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  onBlur={() => blur("message")}
                  className={`${inputClass(!!showError("message"))} resize-y`}
                />
              </Field>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-espresso px-8 py-4 text-sm font-medium tracking-wide text-ivory transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
                >
                  {status === "sending" ? "Sending…" : "Send our reply"}
                  <span aria-hidden>→</span>
                </button>

                <p className="text-xs leading-relaxed text-muted sm:max-w-[18rem]">
                  Or reply the old way:{" "}
                  <a href={`mailto:${wedding.rsvp.email}`} className="link-underline text-espresso">
                    {wedding.rsvp.email}
                  </a>
                </p>
              </div>

              {status === "failed" ? (
                <p role="alert" className="rounded-xl border border-rose-deep/40 bg-blush/25 px-5 py-4 text-sm text-espresso">
                  That didn&apos;t go through — something on our end. Please try again, or just email{" "}
                  <a href={`mailto:${wedding.rsvp.email}`} className="link-underline font-medium">
                    {wedding.rsvp.email}
                  </a>
                  .
                </p>
              ) : null}
            </motion.form>
          )}
        </AnimatePresence>
      </Wrap>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Field plumbing
   ──────────────────────────────────────────────────────────────────────────── */

function inputClass(invalid: boolean) {
  return `w-full rounded-xl border bg-ivory/90 px-4 py-3 text-base text-espresso outline-none transition-colors placeholder:text-muted/80 ${
    invalid ? "border-rose-deep/70" : "border-gold/30 focus:border-gold/80"
  }`;
}

/**
 * Label, control, hint and error as one unit.
 *
 * The hint and the error are wired to the control with `aria-describedby` and
 * `aria-invalid` via the child, which is why the caller passes the same `id` here
 * and on the input — a label that merely sits above a box isn't associated with it.
 */
function Field({
  id,
  label,
  hint,
  error,
  optional = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="eyebrow flex items-baseline gap-2">
        {label}
        {optional ? <span className="text-[0.7rem] font-medium tracking-normal normal-case text-muted/80">optional</span> : null}
      </label>

      {/* Cloning is the least-bad way to push the ARIA wiring onto whatever control
          the caller passed — input, select or textarea — without a prop for each. */}
      {isValidElement<HTMLAttributes<HTMLElement>>(children)
        ? cloneElement(children, {
            "aria-describedby": describedBy || undefined,
            "aria-invalid": error ? true : undefined,
          } as HTMLAttributes<HTMLElement>)
        : children}

      {hint ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}

      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-xs font-semibold text-rose-deep">
      {children}
    </p>
  );
}
