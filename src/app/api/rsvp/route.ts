import { NextResponse } from "next/server";
import { appendFile } from "node:fs/promises";
import path from "node:path";

import { coerceRsvp, hasErrors, validateRsvp } from "@/lib/rsvp";

/**
 * RSVP intake.
 *
 * A demo sink, deliberately: replies are appended as JSON Lines to `.rsvps.jsonl`
 * at the project root. That's the right shape for a wedding site nobody wants to
 * run a database for, and it's trivially `jq`-able. Swap the `record()` call for
 * an email, a Google Sheet, or an actual table when you go live.
 *
 * Two things it does properly, because they're the parts that bite:
 *
 *  - It re-validates. The client's inline errors are a courtesy; this is the gate.
 *  - It survives a read-only filesystem. Serverless platforms mount the bundle
 *    read-only, and a guest getting "something went wrong" because a log line
 *    failed is a worse outcome than an unlogged reply, so a write failure is
 *    logged and swallowed.
 */

export const runtime = "nodejs";

const STORE = path.join(process.cwd(), ".rsvps.jsonl");

/** Crude per-IP throttle. Resets on redeploy, which is fine for the blast radius. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

function throttled(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Keep the map from growing without bound across a long-lived process.
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (throttled(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many replies from this address. Give it a minute." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const input = coerceRsvp(body);
  const errors = validateRsvp(input);

  if (hasErrors(errors)) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const record = {
    ...input,
    name: input.name.trim(),
    email: input.email.trim(),
    receivedAt: new Date().toISOString(),
    ip,
  };

  try {
    await appendFile(STORE, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    // Never fail the guest over this. Log loudly enough that whoever runs the
    // site notices in their platform logs.
    console.error("[rsvp] could not persist reply — falling back to log only", error);
    console.info("[rsvp]", JSON.stringify(record));
  }

  return NextResponse.json({ ok: true });
}

/** A bare GET here is almost always someone poking the URL by hand. */
export function GET() {
  return NextResponse.json({ ok: false, error: "POST an RSVP here." }, { status: 405 });
}
