import { animalById, type AnimalId } from "./animals";

/** A tiny read-along. The animal is the hero. The child's name is not spoken. */
export function storyLines(animal: AnimalId): string[] {
  const friend = animalById(animal).name.toLowerCase();
  return [
    `The ${friend} wakes up in a soft nest.`,
    `The ${friend} finds a red ball and rolls it home.`,
    `The ${friend} snuggles in. The end.`,
  ];
}
