import { artOf, Avatar, frameFor, viewFor, type ArtView } from "../avatars";
import type { AnimalId } from "../data/animals";
import type { Outfit, OutfitSlot } from "../data/wardrobe";
import type { Mood } from "../game/kit";
import { wearArt } from "../wardrobeArt";

/**
 * The child's animal, plus any outfit they have already earned and chosen. `mood` is how it looks
 * (see kit.tsx); `view` is its face or its whole figure. The outfit pieces sit on the head: in the
 * face view that is the whole box, in the body view the part of the figure the art says (so a hat
 * is on the head and not on the belly). A piece is a painted picture placed where the art says
 * (one without a picture shows nothing); the sky colour is a tint of the animal itself (its own
 * filter, from the art).
 */
export function Hero({ animal, outfit, mood, view = "face" }: { animal: AnimalId; outfit: Outfit; mood?: Mood; view?: ArtView }) {
  const shown = viewFor(animal, view);
  const art = artOf(animal);
  const head = shown === "body" ? art?.head : undefined;
  // The pieces go with the head. A mood's face has the head somewhere else than the idle face (a
  // cheer tips it, a think turns it), and the pieces used to stay where the idle eyes were, so the
  // glasses sat off the eyes while the mood showed. The art says where each frame's head is
  // (animalArt.json `pose`, from scripts/wardrobe-pose.py); the head layer is moved by that, with
  // the same easing as the face's fade, and back when the mood is over.
  const frame = mood !== undefined && shown === "face" ? frameFor(animal, mood) : "idle";
  const pose = frame === "idle" ? undefined : art?.pose?.[frame];
  const headStyle: React.CSSProperties | undefined = head
    ? { left: `${head.x * 100}%`, top: `${head.y * 100}%`, width: `${head.w * 100}%`, height: `${head.h * 100}%` }
    : pose
      ? { transform: `translate(${pose.dx * 100}%, ${pose.dy * 100}%) rotate(${pose.rotate}deg) scale(${pose.scale})` }
      : undefined;
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
      <span className="hero-head" aria-hidden="true" data-pose={pose ? frame : "idle"} style={headStyle}>
        <span className="wear wear-color" />
        {(["scarf", "glasses", "hat"] as const).map((slot) => (
          <Wear key={slot} slot={slot} id={outfit[slot]} animal={animal} view={shown} />
        ))}
      </span>
    </span>
  );
}

function Wear({ slot, id, animal, view }: { slot: Exclude<OutfitSlot, "color">; id: Outfit[OutfitSlot]; animal: AnimalId; view: ArtView }) {
  const painted = wearArt(id, animal, view);
  if (!painted) return <span className={`wear wear-${slot}`} />;
  const { x, y, w, h, rotate } = painted.place;
  return (
    <img
      className={`wear wear-${slot} wear-painted`}
      src={painted.src}
      alt=""
      draggable={false}
      decoding="async"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%`, transform: rotate ? `rotate(${rotate}deg)` : undefined }}
    />
  );
}
