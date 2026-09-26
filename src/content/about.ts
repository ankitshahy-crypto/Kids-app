import { version } from "../../package.json";

/** Marketing copy for About and for docs/store-listing.md. Edit it here. */
export const aboutContent = {
  screenTitle: "About WordNest",
  name: "WordNest: Learn to Read",
  subtitle: "Reading practice for ages 3–5",
  promo:
    "Five happy minutes a day. Your child's own animal is the hero of every story, with no ads, no tricks, and no surprise charges.",
  description:
    "WordNest helps young children take their first steps into reading, one small word at a time. Made for ages 3 to 5 (phonics for ages 5 to 7 coming soon). Your child picks an animal friend who becomes the hero of every story. Each day brings a short, gentle lesson of 5 to 10 minutes: kids learn letters and their sounds, then drag their finger across a word to hear it come together: “c… a… t… cat!”",
  differentHeading: "What makes WordNest different",
  features: [
    {
      id: "hero",
      title: "Your child is the hero",
      body: "Stories star the animal they chose.",
    },
    {
      id: "voice",
      title: "Real, warm voices",
      body: "Natural voices, not a robot.",
    },
    {
      id: "blend",
      title: "Drag to blend",
      body: "Slide across a word and hear each sound join into the whole word, the way blending is taught in classrooms.",
    },
    {
      id: "lesson",
      title: "Short daily lessons",
      body: "5–10 minutes builds a habit without too much screen time.",
    },
    {
      id: "stars",
      title: "Stars for trying",
      body: "Effort, not perfection. No pressure, no scores.",
    },
    {
      id: "classroom",
      title: "Made for classrooms too",
      body: "Teachers can follow a class and share goals with parents.",
    },
    {
      id: "grownups",
      title: "Grown-up tools",
      body: "They sit behind a simple check.",
    },
  ],
  safetyHeading: "Safe and private by design",
  safety:
    "No ads, no tracking, no in-app purchase tricks. First name or initial only. Progress stays on your device. No health or personal data collected. Built with children's privacy laws (COPPA) in mind.",
  affordableHeading: "Affordable for every family",
  affordable:
    "Learning to read shouldn't be expensive. WordNest is priced so every family can use it, and through partner schools it's included for families at little or no extra cost. No creeping subscriptions or endless add-ons.",
  disclaimer: "WordNest is reading practice for young children. It is not a therapy or diagnostic tool.",
  maker: "WordNest is made by TriageDesk.",
  /** Matches package.json. The About screen shows this number. */
  version,
} as const;

export type AboutFeatureId = (typeof aboutContent.features)[number]["id"];
