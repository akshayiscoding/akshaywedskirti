# Akshay & Kirti — a 3D wedding website

A single-scroll wedding site where the camera flies through a **paper-craft diorama** of the
venue as you read. Built with Next.js 16, three.js and Framer Motion.

The whole thing is one page. As you scroll, the camera rides a Catmull-Rom spline through nine
framed shots — a wide establishing view of the grove, down the aisle, over the dinner table,
past the gazebo, and finally settling in front of the ceremony arch at the RSVP form.

---

## Run it

```bash
npm run dev
```

Then open <http://localhost:3000>.

```bash
npm run build && npm start   # production
npm run lint                 # eslint
```

---

## Make it yours

### 1. All the words live in one file

**`src/content/wedding.ts`** is the single source of truth. No component hardcodes
visitor-facing copy. Change the names, the date, the venue, the story, the schedule, the FAQ,
the RSVP contacts — save, done.

```ts
couple: { display: "Akshay & Kirti", monogram: "A&K", ... }
date:   { iso: "2026-11-20T16:30:00+05:30", ... }   // the countdown reads this
venue:  { name: "Rosewood Garden Estate", ... }
```

The `date.iso` value drives the live countdown and the generated calendar invite. Everything
else in `date` is explicit human wording, so you control the exact phrasing.

### 2. Adding or removing a section

Three lists must stay the same length and in the same order:

| File | What it holds |
| --- | --- |
| `src/content/wedding.ts` → `sections` | section id + nav label |
| `src/lib/curve.ts` → `WAYPOINTS` | the camera shot for that section |
| `src/app/page.tsx` | the component, in order |

Add an entry to all three and the camera flight extends to cover it. There's a dev-time
warning in `curve.ts` if the first two drift out of sync.

### 3. Moving things around in the 3D scene

**`src/lib/layout.ts`** is the diorama's floor plan — where the arch stands, how many chair
rows, where the trees and light poles go. Every scene component reads from it, so moving the
arch here moves it everywhere, including the shadows and the camera's aim.

**`src/components/three/paper.ts`** holds the palette and the material factories
(`paper()`, `sheet()`, `foliage()`, `gilt()`, `emissive()`). The same colours are mirrored as
CSS custom properties in `src/app/globals.css` — **change both** if you re-theme.

### 4. Re-aiming the camera

Each entry in `WAYPOINTS` is `{ p: position, t: look-at target, fov, roll }`. Waypoint *i* is
framed exactly when section *i* is centred in the viewport.

Two implementation notes worth knowing before you edit it:

- The spline uses **centripetal** parameterisation, not uniform. Our waypoints are unevenly
  spaced and uniform Catmull-Rom forms cusps and overshoots when spacing varies.
- Sampling uses `getPoint`, **not** `getPointAt`. `getPointAt` re-parameterises by arc length,
  which would slide the knots off their sections.

### 5. Replacing the photographs

`public/gallery/01.svg` … `06.svg` are generated placeholders. Drop real images in and point
`wedding.gallery[].src` at them. If you switch to `.jpg`/`.webp`, you can also move the tiles
from `<img>` to `next/image` — the plain tag is only there because SVG needs extra optimiser
config.

---

## How the scroll and the camera stay in sync

The obvious implementation — `scrollY / (scrollHeight - innerHeight)` — only works if every
section is exactly the same height. Ours aren't; the FAQ is tall and the invitation is short.
The camera would reach the arch while you were still reading the story.

So `ScrollDriver` measures where each section's **centre** actually sits, finds which pair of
sections the viewport centre falls between, and emits a continuous `sectionFloat` (`2.4` = 40%
of the way from §2 to §3). `CameraRig` damps toward that value with a frame-rate independent
exponential, so it feels identical at 60Hz and 120Hz.

Per-frame scroll state lives in a plain mutable singleton (`src/lib/scroll.ts`), deliberately
outside React — routing it through state would re-render the tree 60 times a second. Only
discrete changes (which section is active, quality tier) go through the zustand store in
`src/lib/store.ts`.

---

## Performance

Quality is a three-tier system (`high` / `mid` / `low`) in `src/lib/store.ts`, controlling
petal and lantern counts, shadow map size, post-processing, device pixel ratio and how many
trees render.

- `Bootstrap` makes an initial **guess** from device signals (cores, memory, pointer type,
  viewport width).
- `PerfWatchdog` inside the canvas measures **real** frame rate in 1.5s windows and drops a
  tier after two bad windows. It only ever degrades — hunting between tiers would cause
  visible shader recompiles mid-scroll.

Everything repeated more than a handful of times is GPU-instanced: chairs, trees, florals,
string-light bulbs, lanterns and petals are a few draw calls, not a few thousand. Nothing
allocates inside a frame loop.

---

## Accessibility

- **`prefers-reduced-motion`** is honoured properly rather than nominally. The camera stops
  flying and snaps to each section's waypoint, petals and lanterns freeze into a static
  arrangement, and the canvas switches to `frameloop="demand"` — one frame per section change
  instead of 60 a second, forever. There's also a manual **Motion** toggle in the nav, and an
  explicit user choice beats the OS setting in either direction.
- The canvas is `aria-hidden`. Everything the diorama depicts is also stated in the DOM copy,
  so there's nothing for a screen reader to miss.
- Real semantics throughout: the FAQ is a keyboard-navigable accordion, the gallery tiles are
  buttons, the lightbox is a focus-managed modal that restores focus on close, the schedule
  tabs support arrow keys, and there's a skip link to the RSVP form.
- If WebGL is missing, blocked, or the context is lost, an error boundary swaps in a static
  CSS backdrop. The site stays completely usable — nobody ever gets a blank page.

---

## The RSVP form

`POST /api/rsvp`, validated on both sides. The route appends one JSON line per response to
`.rsvps.jsonl` in the project root — **a local development sink only.**

For a real wedding, swap that write for something durable: an email, a Google Sheet, or a
database. The route is written so a read-only filesystem (Vercel and friends) throws on the
append, logs, and still returns success — a guest's RSVP must never fail because of where
you deployed it.

There's a small in-memory rate limit, which is per-instance only and not a real defence.

---

## Fonts

Playfair Display and Inter are **self-hosted** from `public/fonts` rather than loaded through
`next/font/google`, because this was built on a machine with no network access. The
`@font-face` blocks in `globals.css` include the exact metric overrides
(`size-adjust`, `ascent-override`, …) that Next computes for these two families, so the
fallback occupies identical space and there's no layout shift on load.

If you'd rather use `next/font/google`, delete those `@font-face` blocks and wire the loader
up in `layout.tsx` — the rest of the site only refers to `var(--font-display)` and
`var(--font-sans)`.

---

## Layout

```
src/
├─ content/wedding.ts        ← ALL copy. Start here.
├─ lib/
│  ├─ layout.ts              ← diorama floor plan (positions of everything in 3D)
│  ├─ curve.ts               ← camera flight path, one waypoint per section
│  ├─ scroll.ts              ← per-frame scroll singleton (outside React) + damp()
│  ├─ store.ts               ← zustand: active section, quality tier, motion
│  └─ motion.ts              ← shared Framer Motion variants and easings
├─ components/
│  ├─ Bootstrap.tsx          ← device probe: quality guess + reduced-motion
│  ├─ three/
│  │  ├─ Scene.tsx           ← Canvas, sky, light, fog, post, error boundary
│  │  ├─ SceneHost.tsx       ← client-only load + opening curtain
│  │  ├─ CameraRig.tsx       ← rides the spline, damping, sway, parallax
│  │  ├─ ScrollDriver.tsx    ← DOM scroll → section-aware progress
│  │  ├─ paper.ts            ← palette + material factories + seeded random
│  │  └─ Ground · Hills · Arch · Seating · Reception · Foliage ·
│  │     Structures · StringLights · Lanterns · Petals
│  └─ ui/                    ← Nav, Hero, Countdown, Story, Schedule, Venue,
│                              Gallery, Party, Faq, Rsvp, Footer, primitives
└─ app/
   ├─ page.tsx               ← section order
   ├─ layout.tsx             ← metadata, font preload
   ├─ globals.css            ← design tokens (mirrors paper.ts)
   └─ api/rsvp/route.ts
```

---

## Two things to change before this goes live

1. **`robots`** in `src/app/layout.tsx` is set to `index: false`. That's a deliberate default —
   a wedding site is usually semi-private. Flip it if you want to be found.
2. **The RSVP sink.** See above. `.rsvps.jsonl` will not survive a deploy.
# akshaywedskirti
