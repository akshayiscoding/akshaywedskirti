/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  EDIT THIS FILE TO MAKE THE SITE YOURS.
 *  Everything the visitor reads — names, dates, venue, story, schedule, FAQ —
 *  lives here. No component hardcodes copy. Change a value, save, done.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type StoryBeat = {
  year: string;
  title: string;
  body: string;
  /** Optional place label shown under the title. */
  place?: string;
};

export type ScheduleEvent = {
  time: string;
  title: string;
  body: string;
  /** Dress code / note chip. */
  note?: string;
};

export type ScheduleDay = {
  label: string;
  date: string;
  events: ScheduleEvent[];
};

export type PartyMember = {
  name: string;
  role: string;
  blurb: string;
  /** Two initials for the paper-cut avatar. */
  initials: string;
};

export type FaqItem = { q: string; a: string };

export type GalleryItem = {
  src: string;
  alt: string;
  caption: string;
  /** Aspect ratio hint for the masonry grid. */
  span?: "tall" | "wide" | "square";
};

export const wedding = {
  /** ── The couple ─────────────────────────────────────────────────────── */
  couple: {
    partnerA: { first: "Akshay", last: "Kumar" },
    partnerB: { first: "Kirti", last: "Katta" },
    /** Shown in the hero. Keep it short — it renders very large. */
    display: "Akshay & Kirti",
    monogram: "A&K",
    hashtag: "#KumarMeetsKatta",
  },

  /** ── When ───────────────────────────────────────────────────────────────
   *  ISO 8601 with offset. The countdown and all date chips derive from this.
   */
  date: {
    iso: "2026-12-06T16:30:00+05:30",
    /** Human strings — kept explicit so you control the exact wording. */
    long: "Sunday, the sixth of December, two thousand twenty-six",
    short: "20 · 11 · 2026",
    dayOfWeek: "Sunday",
    time: "4:30 in the afternoon",
    timezoneLabel: "IST",
  },

  /** ── Where ──────────────────────────────────────────────────────────── */
  venue: {
    name: "Rosewood Garden Estate",
    tagline: "An old olive grove, a stone terrace, and far too many string lights.",
    addressLines: ["Survey Road 14, Gangapur", "Nashik, Maharashtra 422013", "India"],
    /** Used for the "Open in Maps" button. */
    mapsQuery: "Rosewood Garden Estate Nashik Maharashtra",
    what3words: "grove.terrace.lanterns",
    directions:
      "Three hours by road from Mumbai on the NH-160, or forty minutes from Nashik airport. The last kilometre is a gravel track through the vineyard — go slow, and follow the lanterns.",
    parking: "Valet at the main gate from 3:00 pm. Overflow parking in the lower field.",
    stay: [
      {
        name: "The Grove House",
        detail: "On-site, 14 rooms. Held under “Kumar–Katta” until 1 November.",
        distance: "0 min",
      },
      {
        name: "Sula Vineyard Resort",
        detail: "A short drive, and a very good breakfast. Group rate available.",
        distance: "12 min",
      },
      {
        name: "Ibis Nashik",
        detail: "Simple, clean, and closest to the airport if you fly in late.",
        distance: "25 min",
      },
    ],
  },

  /** ── Nav / sections ─────────────────────────────────────────────────────
   *  `id` must match the section element id AND the camera waypoint order in
   *  src/lib/curve.ts. Reorder here and the camera flight reorders with it.
   */
  sections: [
    { id: "hero", label: "Welcome" },
    { id: "invitation", label: "Invitation" },
    { id: "story", label: "Our Story" },
    { id: "schedule", label: "Schedule" },
    { id: "venue", label: "Venue" },
    { id: "gallery", label: "Gallery" },
    { id: "party", label: "The Party" },
    { id: "faq", label: "Details" },
    { id: "rsvp", label: "RSVP" },
  ] as const,

  /** ── Invitation block ───────────────────────────────────────────────── */
  invitation: {
    eyebrow: "Together with their families",
    lead: "request the pleasure of your company",
    body: "at the celebration of their marriage — two days of food, noise, and dancing under the olive trees. Come hungry. Bring flat shoes.",
    rsvpBy: "1 November 2026",
  },

  /** ── Our story ──────────────────────────────────────────────────────── */
  story: [
    {
      year: "2019",
      title: "A queue for bad coffee",
      place: "King's Cross, London",
      body: "Kirti was reading the menu out loud in an Italian accent to annoy her sister. Akshay laughed at the wrong moment and had to explain himself. He explained himself for two hours.",
    },
    {
      year: "2020",
      title: "Eleven months of screens",
      place: "Nowhere in particular",
      body: "Two cities, one lockdown, and a shared spreadsheet of films neither of them finished. The spreadsheet still exists. It has 340 rows and 12 completions.",
    },
    {
      year: "2022",
      title: "The olive grove",
      place: "Nashik, India",
      body: "Akshay brought Kirti to his grandmother's vineyard. His grandmother told Kirti, within four minutes of meeting her, exactly where the wedding should be. She was right, obviously.",
    },
    {
      year: "2024",
      title: "A very badly kept secret",
      place: "Lisbon, Portugal",
      body: "He had the ring for six weeks. She found it in a sock drawer in week two and said nothing, which is the most romantic thing anyone has ever done for him.",
    },
    {
      year: "2026",
      title: "This bit",
      place: "The same olive grove",
      body: "Same trees, better lighting, and everyone we love in one place at last. We are so glad you're here.",
    },
  ] satisfies StoryBeat[],

  /** ── Schedule ───────────────────────────────────────────────────────── */
  schedule: [
    {
      label: "Day One",
      date: "Saturday 5 December",
      events: [
        {
          time: "6:00 pm",
          title: "Mehendi & Sangeet",
          body: "Henna on the terrace, a live dhol, and a dance-off that both families have been rehearsing for in secret. Akshay's uncles have a routine. We are sorry.",
          note: "Colour, and lots of it",
        },
        {
          time: "9:00 pm",
          title: "Dinner under the lights",
          body: "Long tables in the lower grove. Regional Maharashtrian food, and one very confused Italian nonna asking for parmesan.",
        },
      ],
    },
    {
      label: "Day Two",
      date: "Sunday 6 December",
      events: [
        {
          time: "3:00 pm",
          title: "Arrival & welcome drinks",
          body: "Come early. Sit in the shade. Someone will hand you something cold before you've put your bag down.",
          note: "Garden formal",
        },
        {
          time: "4:30 pm",
          title: "The ceremony",
          body: "Under the arch at the top of the grove, facing the hills. It will take about forty minutes, and at least one of us will cry.",
          note: "Unplugged — no phones, please",
        },
        {
          time: "5:30 pm",
          title: "Photographs & aperitivo",
          body: "We steal fifteen minutes for photos while you drink negronis. This is a fair trade.",
        },
        {
          time: "7:30 pm",
          title: "Dinner & speeches",
          body: "Five courses, four speeches, and a strict two-minute limit that nobody will honour.",
        },
        {
          time: "10:00 pm",
          title: "Dancing",
          body: "Until the generator gives up. There is a late bus to town at 1:00 am, and a very slow walk back for the brave.",
        },
      ],
    },
  ] satisfies ScheduleDay[],

  /** ── Wedding party ──────────────────────────────────────────────────── */
  party: [
    {
      name: "Priya Kumar",
      role: "Sister of the groom",
      blurb: "Chief organiser, keeper of the schedule, and the reason any of this is happening on time.",
      initials: "PM",
    },
    {
      name: "Giulia Katta",
      role: "Sister of the bride",
      blurb: "Will make a speech. Has been told the limit is two minutes. Has written nine.",
      initials: "GR",
    },
    {
      name: "Dev Raghunathan",
      role: "Best man",
      blurb: "Met Akshay in a university library at 3am over a broken vending machine. Inseparable since.",
      initials: "DR",
    },
    {
      name: "Marta Bianchi",
      role: "Maid of honour",
      blurb: "Flew across a continent to help pick the dress, then cried in four separate shops.",
      initials: "MB",
    },
    {
      name: "Kabir Kumar",
      role: "Brother of the groom",
      blurb: "In charge of the music, and dangerously confident about it.",
      initials: "KM",
    },
    {
      name: "Sofia Katta",
      role: "Flower authority",
      blurb: "Age seven. Has strong opinions about petal distribution and will not be negotiated with.",
      initials: "SR",
    },
  ] satisfies PartyMember[],

  /** ── Gallery ────────────────────────────────────────────────────────────
   *  Replace these with real photographs in /public/gallery. The bundled SVGs
   *  are generated placeholders so the layout reads correctly before you do.
   */
  gallery: [
    { src: "/gallery/01.svg", alt: "The couple on the terrace at dusk", caption: "The terrace, last summer", span: "tall" },
    { src: "/gallery/02.svg", alt: "Olive trees in low sun", caption: "The grove at six o'clock", span: "wide" },
    { src: "/gallery/03.svg", alt: "Hands and the ring", caption: "Week two of the sock drawer", span: "square" },
    { src: "/gallery/04.svg", alt: "Long table set for dinner", caption: "A rehearsal, of sorts", span: "square" },
    { src: "/gallery/05.svg", alt: "String lights above the stone steps", caption: "Far too many lights", span: "tall" },
    { src: "/gallery/06.svg", alt: "The hills behind the estate", caption: "What you'll be looking at", span: "wide" },
  ] satisfies GalleryItem[],

  /** ── FAQ ────────────────────────────────────────────────────────────── */
  faq: [
    {
      q: "What should I wear?",
      a: "Garden formal for Sunday — think linen, light colours, and shoes that survive grass and gravel. Saturday's sangeet is as colourful as you can manage. Nobody has ever regretted overdressing at our family events.",
    },
    {
      q: "Can I bring my children?",
      a: "Yes, gladly. Saturday is genuinely child-friendly and there'll be a supervised room off the terrace from 7 pm on Sunday. Tell us ages on the RSVP and we'll plan properly.",
    },
    {
      q: "Can I bring a plus one?",
      a: "Your invitation says who's included, and the RSVP form will only offer the seats we've held for you. If your situation has changed since we sent it, just email us — we'd rather sort it than have you wonder.",
    },
    {
      q: "Is the ceremony really unplugged?",
      a: "Really. Forty minutes with no screens between us and your faces. Afterwards, photograph everything relentlessly and tag it #KumarMeetsKatta.",
    },
    {
      q: "I have a dietary requirement.",
      a: "The kitchen is fully vegetarian-capable and used to Jain, vegan, and gluten-free requests. Put the detail in the RSVP box — the more specific, the better the food.",
    },
    {
      q: "How do I get there without a car?",
      a: "There's a coach from Nashik city centre at 2:00 pm on Sunday and a return at 1:00 am, both free. Say yes to the shuttle on the RSVP and we'll hold you a seat.",
    },
    {
      q: "What's the weather like in December?",
      a: "Warm days, around 28°C, and genuinely cool after sunset — low teens. Bring a layer for the evening. The terrace has heaters but they're mostly decorative.",
    },
    {
      q: "Gifts?",
      a: "Your presence is the thing, and we mean it. If you'd like to mark the day anyway, there's a note in the RSVP confirmation about a fund for the honeymoon and a school in Gangapur we care about.",
    },
  ] satisfies FaqItem[],

  /** ── RSVP ───────────────────────────────────────────────────────────── */
  rsvp: {
    deadline: "1 November 2026",
    email: "Akshay.and.Kirti@example.com",
    phone: "+91 98765 43210",
    /** Max guests selectable in the party-size control. */
    maxParty: 4,
  },

  /** ── Footer ─────────────────────────────────────────────────────────── */
  footer: {
    note: "Made with a great deal of love, and rather too many string lights.",
    credit: "Paper-craft diorama built with Next.js, three.js and Framer Motion.",
  },
} as const;

export type SectionId = (typeof wedding.sections)[number]["id"];

export const sectionIds = wedding.sections.map((s) => s.id) as SectionId[];
