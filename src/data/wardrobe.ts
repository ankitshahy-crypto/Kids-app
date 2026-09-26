/** Cosmetic items earned with stars. Nothing here can be bought. */
export const wardrobe = [
  { id: "hat-leaf", slot: "hat", name: "Leaf hat", stars: 1 },
  { id: "scarf-stripe", slot: "scarf", name: "Stripe scarf", stars: 3 },
  { id: "glasses-round", slot: "glasses", name: "Round glasses", stars: 5 },
  { id: "color-sky", slot: "color", name: "Sky color", stars: 8 },
  { id: "hat-crown", slot: "hat", name: "Paper crown", stars: 10 },
  { id: "scarf-dots", slot: "scarf", name: "Dot scarf", stars: 15 },
] as const;

export type WardrobeItem = (typeof wardrobe)[number];
export type WardrobeId = WardrobeItem["id"];
export type OutfitSlot = WardrobeItem["slot"];

export type Outfit = Record<OutfitSlot, WardrobeId | null>;

export const emptyOutfit = (): Outfit => ({
  hat: null,
  scarf: null,
  glasses: null,
  color: null,
});

export function wardrobeItem(id: string): WardrobeItem | null {
  return wardrobe.find((item) => item.id === id) ?? null;
}

export function isWardrobeId(value: string): value is WardrobeId {
  return wardrobe.some((item) => item.id === value);
}

export function itemForSlot(id: string | null, slot: OutfitSlot): WardrobeId | null {
  if (!id || !isWardrobeId(id)) return null;
  const item = wardrobeItem(id);
  return item && item.slot === slot ? item.id : null;
}
