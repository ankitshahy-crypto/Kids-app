import { ACCOUNT_KEY, readStored, writeStored } from "../storage";

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type AccountRole = "grownup" | "teacher";

export type AccountPrefs = {
  sync: boolean;
  role: AccountRole;
};

export const DEFAULT_ACCOUNT_PREFS: AccountPrefs = {
  sync: false,
  role: "grownup",
};

export function accountRole(value: unknown): AccountRole {
  return value === "teacher" ? "teacher" : "grownup";
}

export function loadAccountPrefs(storage: KeyValueStore = localStorage): AccountPrefs {
  try {
    const raw = readStored(storage, ACCOUNT_KEY);
    if (!raw) return DEFAULT_ACCOUNT_PREFS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_ACCOUNT_PREFS;
    const record = parsed as Partial<AccountPrefs>;
    return { sync: record.sync === true, role: accountRole(record.role) };
  } catch {
    return DEFAULT_ACCOUNT_PREFS;
  }
}

export function saveAccountPrefs(prefs: AccountPrefs, storage: KeyValueStore = localStorage): void {
  writeStored(storage, ACCOUNT_KEY, JSON.stringify({ sync: prefs.sync === true, role: accountRole(prefs.role) }));
}
