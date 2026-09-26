import { Avatar } from "../avatars";
import type { AnimalId } from "../data/animals";
import type { Outfit } from "../data/wardrobe";

/** The child's animal, plus any outfit they have already earned and chosen. */
export function Hero({ animal, outfit }: { animal: AnimalId; outfit: Outfit }) {
  return (
    <span
      className="hero"
      data-hat={outfit.hat ?? ""}
      data-scarf={outfit.scarf ?? ""}
      data-glasses={outfit.glasses ?? ""}
      data-color={outfit.color ?? ""}
    >
      <span className="wear wear-color" aria-hidden="true" />
      <Avatar animal={animal} />
      <span className="wear wear-scarf" aria-hidden="true" />
      <span className="wear wear-glasses" aria-hidden="true" />
      <span className="wear wear-hat" aria-hidden="true" />
    </span>
  );
}
