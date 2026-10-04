/**
 * Which grown-up tips each child's grown-up has already seen opened, kept on the device.
 *
 * A tip opens in full the first time an activity is opened for a child. After that it waits as a
 * small "For grown-ups" chip, which a grown-up can tap to read it again. Before this, the full tip
 * card sat at the top of about a third of the child's screens, every time.
 */
const SEEN_KEY = "littlenest-tips-seen-v1";

type SeenStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

type Seen = Record<string, string[]>;

function storage(): SeenStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function read(store: SeenStore | null): Seen {
  if (!store) return {};
  try {
    const raw = store.getItem(SEEN_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const seen: Seen = {};
    for (const [childId, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(ids)) seen[childId] = ids.filter((id): id is string => typeof id === "string");
    }
    return seen;
  } catch {
    return {};
  }
}

export function tipSeen(childId: string, tipId: string, store: SeenStore | null = storage()): boolean {
  return read(store)[childId]?.includes(tipId) ?? false;
}

export function markTipSeen(childId: string, tipId: string, store: SeenStore | null = storage()): void {
  if (!store) return;
  const seen = read(store);
  const ids = seen[childId] ?? [];
  if (ids.includes(tipId)) return;
  seen[childId] = [...ids, tipId];
  try {
    store.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Storage full or blocked: the tip opens again next time, which is harmless.
  }
}
