import art from "./data/wardrobeArt.json";
import type { AnimalId } from "./data/animals";
import type { WardrobeId } from "./data/wardrobe";

/** Where a painted dress-up piece sits on a face: fractions of the face box (scripts/wardrobe-art.py), and a turn in degrees to stand it straight. */
export type WearPlace = { x: number; y: number; w: number; h: number; rotate?: number };
/** How a piece sits differently on one animal: moved by fractions of the face box, and turned. */
export type WearFit = { dx?: number; dy?: number; rotate?: number };

type Art = Partial<Record<WardrobeId, WearPlace>> & { fits?: Partial<Record<AnimalId, Partial<Record<WardrobeId, WearFit>>>> };
const ART = art as unknown as Art;

/**
 * A dress-up piece's painted picture (public/wardrobe/<id>.webp) and its place on the face, or null
 * for a piece that has no painted picture yet (it is drawn by CSS instead) or is not a picture at
 * all (the sky colour is a tint of the animal itself). The pieces were lifted off the fox wearing
 * them, so they sit where the fox's eyes and head are; an animal whose face differs (the bunny's
 * eyes are lower, its head top under its ears) has its own fit for a piece, which moves and turns it.
 */
export function wearArt(id: WardrobeId | null, animal?: AnimalId): { src: string; place: WearPlace } | null {
  if (!id) return null;
  const place = ART[id];
  if (!place) return null;
  const fit = (animal && ART.fits?.[animal]?.[id]) || {};
  return {
    src: `${import.meta.env.BASE_URL}wardrobe/${id}.webp`,
    place: { x: place.x + (fit.dx ?? 0), y: place.y + (fit.dy ?? 0), w: place.w, h: place.h, rotate: (place.rotate ?? 0) + (fit.rotate ?? 0) },
  };
}
