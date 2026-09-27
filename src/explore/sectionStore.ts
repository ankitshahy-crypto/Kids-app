const NAME = /^[a-z][a-z0-9-]{0,31}$/;

type Store = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function sectionStorageKey(section: string, name: string): string {
  if (!NAME.test(section) || !NAME.test(name)) {
    throw new Error("Explore sections can only write their own keys");
  }
  const key = `littlenest.section.${section}.${name}`;
  if (!key.startsWith(`littlenest.section.${section}.`)) {
    throw new Error("Explore sections can only write their own keys");
  }
  return key;
}

export function writeSection(section: string, name: string, value: string, storage: Store = localStorage): string {
  const key = sectionStorageKey(section, name);
  storage.setItem(key, value);
  return key;
}

export function readSection(section: string, name: string, storage: Store = localStorage): string | null {
  return storage.getItem(sectionStorageKey(section, name));
}
