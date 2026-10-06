import { useEffect } from "react";
import { artOf, Avatar, preloadArt, viewFor, type ArtView } from "../avatars";
import type { AnimalId } from "../data/animals";
import type { Outfit, OutfitSlot } from "../data/wardrobe";
import type { Mood } from "../game/kit";
import { wearArt } from "../wardrobeArt";

/**
 * The child's animal, plus any outfit they have already earned and chosen. `mood` is how it looks
 * (see kit.tsx); `view` is its face or its whole figure. The outfit pieces sit on the head: in the
 * face view that is the whole box, in the body view the part of the figure the art says (so a hat
 * is on the head and not on the belly). A painted piece is a picture placed where the art says; a
 * piece without one yet is drawn by CSS; the sky colour is a tint of the animal itself (its own
 * filter, from the art).
 */
export function Hero({ animal, outfit, mood, view = "face" }: { animal: AnimalId; outfit: Outfit; mood?: Mood; view?: ArtView }) {
  // The child's animal's other frames, ready before a mood asks for them.
  useEffect(() => preloadArt(animal), [animal]);
  const shown = viewFor(animal, view);
  const art = artOf(animal);
  const head = shown === "body" ? art?.head : undefined;
  return (
    <span
      className="hero"
      data-view={shown}
      data-hat={outfit.hat ?? ""}
      data-scarf={outfit.scarf ?? ""}
      data-glasses={outfit.glasses ?? ""}
      data-color={outfit.color ?? ""}
      style={outfit.color === "color-sky" && art?.sky ? ({ "--sky": art.sky } as React.CSSProperties) : undefined}
    >
      <Avatar animal={animal} mood={mood} view={shown} />
      <span
        className="hero-head"
        aria-hidden="true"
        style={head ? { left: `${head.x * 100}%`, top: `${head.y * 100}%`, width: `${head.w * 100}%`, height: `${head.h * 100}%` } : undefined}
      >
        <span className="wear wear-color" />
        {(["scarf", "glasses", "hat"] as const).map((slot) => (
          <Wear key={slot} slot={slot} id={outfit[slot]} />
        ))}
      </span>
    </span>
  );
}

function Wear({ slot, id }: { slot: Exclude<OutfitSlot, "color">; id: Outfit[OutfitSlot] }) {
  const painted = wearArt(id);
  if (!painted) return <span className={`wear wear-${slot}`} />;
  const { x, y, w, h } = painted.place;
  return (
    <img
      className={`wear wear-${slot} wear-painted`}
      src={painted.src}
      alt=""
      draggable={false}
      decoding="async"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
    />
  );
}
