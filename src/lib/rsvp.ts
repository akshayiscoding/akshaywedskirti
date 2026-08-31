/**
 * The RSVP payload and its validation — shared by the form and the route handler.
 *
 * One module, imported by both, because two copies of a validation rule diverge
 * the first time someone adds a field. The client uses it for instant inline
 * errors; the server uses it as the actual gate, since anything from a browser is
 * a suggestion.
 */

import { wedding } from "@/content/wedding";

export type RsvpInput = {
  name: string;
  email: string;
  attending: "yes" | "no" | "";
  partySize: number;
  guests: string;
  dietary: string;
  shuttle: boolean;
  message: string;
};

export type RsvpErrors = Partial<Record<keyof RsvpInput, string>>;

export const emptyRsvp: RsvpInput = {
  name: "",
  email: "",
  attending: "",
  partySize: 1,
  guests: "",
  dietary: "",
  shuttle: false,
  message: "",
};

/** Deliberately permissive. Rejecting a valid address is worse than accepting a typo. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const LIMITS = {
  name: 120,
  email: 200,
  guests: 600,
  dietary: 800,
  message: 1200,
} as const;

export function validateRsvp(input: RsvpInput): RsvpErrors {
  const errors: RsvpErrors = {};

  const name = input.name.trim();
  if (name.length < 2) errors.name = "We'll need a name to put on the seat.";
  else if (name.length > LIMITS.name) errors.name = "That's longer than we can store.";

  const email = input.email.trim();
  if (!email) errors.email = "An email, so we can send you the details.";
  else if (!EMAIL.test(email)) errors.email = "That doesn't look like an email address.";
  else if (email.length > LIMITS.email) errors.email = "That's longer than we can store.";

  if (input.attending !== "yes" && input.attending !== "no") {
    errors.attending = "Let us know either way — a no is genuinely fine.";
  }

  if (input.attending === "yes") {
    if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > wedding.rsvp.maxParty) {
      errors.partySize = `Between 1 and ${wedding.rsvp.maxParty}. Email us if you need more.`;
    }
    if (input.partySize > 1 && input.guests.trim().length < 2) {
      errors.guests = "Names for everyone coming, so we can write the place cards.";
    }
  }

  for (const field of ["guests", "dietary", "message"] as const) {
    if (input[field].length > LIMITS[field]) errors[field] = "That's longer than we can store.";
  }

  return errors;
}

export function hasErrors(errors: RsvpErrors) {
  return Object.keys(errors).length > 0;
}

/**
 * Coerce an unknown JSON body into the shape `validateRsvp` expects.
 *
 * Nothing here trusts a type: a request can carry any JSON at all, including
 * numbers where strings belong and vice versa, so every field is narrowed by hand
 * before it reaches validation.
 */
export function coerceRsvp(body: unknown): RsvpInput {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  return {
    name: str(b.name),
    email: str(b.email),
    attending: b.attending === "yes" || b.attending === "no" ? b.attending : "",
    partySize: Number.isFinite(Number(b.partySize)) ? Math.trunc(Number(b.partySize)) : 0,
    guests: str(b.guests),
    dietary: str(b.dietary),
    shuttle: b.shuttle === true,
    message: str(b.message),
  };
}
