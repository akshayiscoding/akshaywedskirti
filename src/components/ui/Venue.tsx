"use client";

/**
 * Getting there and staying there. The most practically useful section on the
 * site, so it's the plainest one — everything a guest needs to solve their own
 * logistics without emailing anyone.
 */

import { wedding } from "@/content/wedding";
import { Cascade, Chip, Child, Heading, Reveal, Section, Wrap } from "./primitives";

const { venue } = wedding;

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.mapsQuery)}`;

export function Venue() {
  return (
    <Section id="venue" size="tall">
      <Wrap className="flex flex-col gap-14">
        <Heading eyebrow="Where" title={venue.name} lead={venue.tagline} id="venue-title" />

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="vellum flex flex-col gap-5 rounded-2xl p-8 lg:col-span-1">
            <h3 className="eyebrow">The address</h3>
            <address className="font-display text-2xl leading-snug text-espresso not-italic">
              {venue.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>

            <p className="text-sm text-muted">
              what3words <span className="font-medium text-espresso">///{venue.what3words}</span>
            </p>

            <a
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-espresso px-5 py-3 text-sm font-medium text-ivory transition-transform hover:-translate-y-0.5"
            >
              Open in Maps
              <span aria-hidden>↗</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Reveal>

          <Reveal delay={0.08} className="vellum flex flex-col gap-6 rounded-2xl p-8 lg:col-span-2">
            <div>
              <h3 className="eyebrow">Getting there</h3>
              <p className="mt-4 text-base leading-relaxed text-ink">{venue.directions}</p>
            </div>
            <div className="rule" />
            <div>
              <h3 className="eyebrow">Parking</h3>
              <p className="mt-4 text-base leading-relaxed text-ink">{venue.parking}</p>
            </div>
            <p className="mt-2">
              <Chip tone="leaf">Free coach from Nashik, 2:00 pm Sunday</Chip>
            </p>
          </Reveal>
        </div>

        <div className="flex flex-col gap-8">
          <Reveal>
            <h3 className="eyebrow text-center">Somewhere to sleep</h3>
          </Reveal>

          <Cascade as="ul" className="grid gap-5 sm:grid-cols-3">
            {venue.stay.map((place) => (
              <Child as="li" key={place.name} className="vellum-solid flex flex-col gap-3 rounded-2xl p-7">
                <span className="eyebrow text-[0.7rem] font-semibold">{place.distance} away</span>
                <h4 className="text-title leading-tight text-espresso">{place.name}</h4>
                <p className="text-sm leading-relaxed text-muted">{place.detail}</p>
              </Child>
            ))}
          </Cascade>
        </div>
      </Wrap>
    </Section>
  );
}
