import { OUTBOX_KEY, readStored, writeStored } from "../storage";

/**
 * Work that needs a network later. Nothing here is sent.
 * A class server can read `class-sync` jobs when one exists.
 * Share jobs keep the link the grown-up asked to send.
 */
export type OutboxKind = "share" | "class-sync";

export type OutboxJob = {
  kind: OutboxKind;
  payload: unknown;
  createdAt: string;
};

const STORAGE_KEY = OUTBOX_KEY;
const EVENT = "littlenest-outbox";

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function store(): KeyValueStore | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readOutbox(storage: KeyValueStore | null = store()): OutboxJob[] {
  if (!storage) return [];
  try {
    const raw = readStored(storage, STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((job) => job && (job.kind === "share" || job.kind === "class-sync"));
  } catch {
    return [];
  }
}

function writeOutbox(jobs: OutboxJob[], storage: KeyValueStore | null = store()): void {
  if (!storage) return;
  try {
    writeStored(storage, STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // A full disk must not surface as an error in the lesson.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** One job per kind. A newer request replaces the older one. */
export function enqueue(kind: OutboxKind, payload: unknown, storage: KeyValueStore | null = store()): void {
  const jobs = readOutbox(storage).filter((job) => job.kind !== kind);
  jobs.push({ kind, payload, createdAt: new Date().toISOString() });
  writeOutbox(jobs, storage);
}

export function removeOutbox(kind: OutboxKind, storage: KeyValueStore | null = store()): void {
  writeOutbox(
    readOutbox(storage).filter((job) => job.kind !== kind),
    storage,
  );
}

export function onOutbox(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** Queue a class placement while offline. Online, there is no class server yet, so this does nothing. */
export function requestClassSync(payload: unknown): void {
  if (typeof navigator === "undefined" || navigator.onLine !== false) return;
  enqueue("class-sync", payload);
}
