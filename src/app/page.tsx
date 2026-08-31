import { ScrollDriver } from "@/components/three/ScrollDriver";
import { SceneHost } from "@/components/three/SceneHost";
import { Nav } from "@/components/ui/Nav";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { Hero } from "@/components/ui/Hero";
import { Invitation } from "@/components/ui/Invitation";
import { Story } from "@/components/ui/Story";
import { Schedule } from "@/components/ui/Schedule";
import { Venue } from "@/components/ui/Venue";
import { Gallery } from "@/components/ui/Gallery";
import { Party } from "@/components/ui/Party";
import { Faq } from "@/components/ui/Faq";
import { Rsvp } from "@/components/ui/Rsvp";
import { Footer } from "@/components/ui/Footer";

/**
 * The whole site is one scroll.
 *
 * Layering: the 3D diorama is `fixed` at z-0, the content scrolls over it at
 * z-10, the chrome sits at z-50. The section ORDER here must match
 * `wedding.sections` and the camera waypoints in `src/lib/curve.ts` — those three
 * lists are what keep the camera flight locked to what you're reading.
 */
export default function Page() {
  return (
    <>
      <SceneHost />
      <ScrollDriver />
      <ScrollProgress />
      <Nav />

      <main className="relative z-10">
        <Hero />
        <Invitation />
        <Story />
        <Schedule />
        <Venue />
        <Gallery />
        <Party />
        <Faq />
        <Rsvp />
      </main>

      <Footer />
    </>
  );
}
