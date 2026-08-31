import type { Metadata, Viewport } from "next";
import { wedding } from "@/content/wedding";
import { Bootstrap } from "@/components/Bootstrap";
import "./globals.css";

const title = `${wedding.couple.display} — ${wedding.date.short}`;
const description = `${wedding.couple.display} are getting married at ${wedding.venue.name}, ${wedding.date.long}. Schedule, travel, stay and RSVP.`;

export const metadata: Metadata = {
  title,
  description,
  applicationName: title,
  keywords: [wedding.couple.display, "wedding", wedding.venue.name, wedding.couple.hashtag],
  openGraph: {
    title,
    description,
    type: "website",
    siteName: title,
  },
  twitter: { card: "summary_large_image", title, description },
  robots: {
    // A wedding site is semi-private: discoverable by people with the link,
    // but there's no reason for it to rank. Flip this if you want it indexed.
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#faf6f0",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* The two faces used above the fold. Preloading them stops the display
            type reflowing from the metric-matched fallback on first paint. */}
        <link rel="preload" href="/fonts/playfair-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="bg-ivory text-ink antialiased">
        <Bootstrap />
        {children}
      </body>
    </html>
  );
}
