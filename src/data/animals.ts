export const animals = [
  { id: "cat", name: "Cat" },
  { id: "dog", name: "Dog" },
  { id: "fox", name: "Fox" },
  { id: "bear", name: "Bear" },
  { id: "bunny", name: "Bunny" },
  { id: "owl", name: "Owl" },
  { id: "frog", name: "Frog" },
  { id: "duck", name: "Duck" },
  { id: "pig", name: "Pig" },
  { id: "penguin", name: "Penguin" },
  { id: "lion", name: "Lion" },
  { id: "koala", name: "Koala" },
] as const;

export type AnimalId = (typeof animals)[number]["id"];

export function animalById(id: AnimalId) {
  const animal = animals.find((item) => item.id === id);
  if (!animal) throw new Error(`Unknown animal ${id}`);
  return animal;
}

export function isAnimalId(value: string): value is AnimalId {
  return animals.some((animal) => animal.id === value);
}
