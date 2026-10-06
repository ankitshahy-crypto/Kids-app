import art from "./data/wardrobeArt.json";
import type { WardrobeId } from "./data/wardrobe";

/** Where a painted dress-up piece sits on a face: fractions of the face box (scripts/wardrobe-art.py). */
export type WearPlace = { x: number; y: number; w: number; h: number };

const ART = art as Partial<Record<WardrobeId, WearPlace>>;

/**
 * A dress-up piece's painted picture (public/wardrobe/<id>.webp) and its place on the face, or null
 * for a piece that has no painted picture yet (it is drawn by CSS instead) or is not a picture at
 * all (the sky colour is a tint of the animal itself).
 */
export function wearArt(id: WardrobeId | null): { src: string; place: WearPlace } | null {
  if (!id) return null;
  const place = ART[id];
  return place ? { src: `${import.meta.env.BASE_URL}wardrobe/${id}.webp`, place } : null;
}
