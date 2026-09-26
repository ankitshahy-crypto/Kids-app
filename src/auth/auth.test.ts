import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createChild } from "../data/profiles";
import { DEFAULT_SETTINGS } from "../settings";
import { backupHasDroppedKeys, mergeBackups, parseBackup, toBackup } from "./backup";
import { authConfigured, readAuthConfig } from "./config";
import { ACCOUNT_OFF, KIDS_NEVER_LOGIN, PRIVACY_LINES, SYNC_LABEL } from "./copy";
import {
  authPlatform,
  friendlyAuthError,
  magicContinueUrl,
  providerTransport,
  readPreview,
  webSignInFlow,
} from "./plan";
import { loadAccountPrefs, saveAccountPrefs } from "./prefs";

const env = {
  VITE_FIREBASE_API_KEY: "demo-key",
  VITE_FIREBASE_AUTH_DOMAIN: "littlenest-families.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "littlenest-families",
  VITE_FIREBASE_APP_ID: "1:123:web:abc",
};

function memory() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

describe("sign-in stays off without its own Firebase project", () => {
  it("is off when any value is missing", () => {
    expect(readAuthConfig({})).toBeNull();
    expect(readAuthConfig({ ...env, VITE_FIREBASE_APP_ID: "  " })).toBeNull();
    expect(authConfigured({})).toBe(false);
  });

  it("refuses a TriageDesk project", () => {
    expect(readAuthConfig({ ...env, VITE_FIREBASE_PROJECT_ID: "triagedesk-prod" })).toBeNull();
    expect(readAuthConfig({ ...env, VITE_FIREBASE_AUTH_DOMAIN: "auth.triagedesk.ai" })).toBeNull();
    expect(readAuthConfig(env)?.projectId).toBe("littlenest-families");
  });
});

describe("where each provider signs in", () => {
  it("uses the native sheet for Apple and Google on the iPhone app", () => {
    const ios = authPlatform({ native: true, os: "ios" });
    expect(providerTransport(ios, "apple")).toBe("native");
    expect(providerTransport(ios, "google")).toBe("native");
    expect(providerTransport(ios, "email")).toBe("web");
  });

  it("uses the web SDK in Safari, Chrome, Firefox, Edge, and Android Chrome", () => {
    const web = authPlatform({ native: false, os: "ios" });
    expect(web).toBe("web");
    expect(providerTransport(web, "apple")).toBe("web");
    expect(providerTransport(web, "google")).toBe("web");
    expect(providerTransport(authPlatform({ native: false, os: "android" }), "google")).toBe("web");
    expect(webSignInFlow(true)).toBe("redirect");
    expect(webSignInFlow(false)).toBe("popup");
  });

  it("keeps a dev preview out of production", () => {
    expect(readPreview(false, "signed-in")).toBeNull();
    expect(readPreview(true, "signed-in")).toBe("signed-in");
    expect(readPreview(true, "ready")).toBe("ready");
    expect(readPreview(true, "on")).toBeNull();
  });
});

describe("backup keeps the minimum and never loses progress", () => {
  it("stores a first name, animal, progress, stars, and settings, and drops photos", () => {
    const child = createChild({ name: "Mia Smith", ageRange: "4", animal: "fox" });
    const dirty = { ...child, photo: "pic", photoSrc: "file", email: "mia@x.com", lastName: "Smith" };
    const backup = toBackup([dirty], { ...DEFAULT_SETTINGS, showCode: true }, "teacher", "2026-09-01T00:00:00.000Z");
    expect(backup.children).toHaveLength(1);
    expect(backup.children[0]?.name).toBe("Mia");
    expect(backup.children[0]?.animal).toBe("fox");
    expect(backup.role).toBe("teacher");
    expect(backup.settings.showCode).toBe(true);
    expect(backupHasDroppedKeys(backup)).toBe(false);
    expect(JSON.stringify(backup)).not.toMatch(/photo|lastName|@x.com/);
  });

  it("merges stars and finished steps forward", () => {
    const child = createChild({ name: "M", ageRange: "5", animal: "owl" });
    const localChild = {
      ...child,
      stars: 2,
      days: { "2026-09-01": { reading: { letter: true } } },
      games: { hatch: 1 as const, hatches: 0, spins: 1 },
    };
    const remoteChild = {
      ...child,
      stars: 5,
      name: "M",
      days: { "2026-09-01": { reading: { draw: true } }, "2026-09-02": { math: { count: true } } },
      games: { hatch: 2 as const, hatches: 1, spins: 0 },
    };
    const local = toBackup([localChild], DEFAULT_SETTINGS, "grownup", "2026-09-02T00:00:00.000Z");
    const remote = toBackup([remoteChild], { ...DEFAULT_SETTINGS, readingGoal: 15 }, "teacher", "2026-09-03T00:00:00.000Z");
    const merged = mergeBackups(local, remote);
    const saved = merged.children[0];
    expect(saved?.stars).toBe(5);
    expect(saved?.days["2026-09-01"]?.reading?.letter).toBe(true);
    expect(saved?.days["2026-09-01"]?.reading?.draw).toBe(true);
    expect(saved?.days["2026-09-02"]?.math?.count).toBe(true);
    expect(saved?.games.hatch).toBe(2);
    expect(saved?.games.spins).toBe(1);
    expect(merged.role).toBe("teacher");
    expect(merged.settings.readingGoal).toBe(15);
  });

  it("does not let an older copy erase a newer name or a higher star count", () => {
    const child = createChild({ name: "Ana", ageRange: "6-7", animal: "bear" });
    const newer = toBackup([{ ...child, stars: 4, name: "Ana" }], DEFAULT_SETTINGS, "grownup", "2026-09-04T00:00:00.000Z");
    const older = toBackup([{ ...child, stars: 9, name: "Ann" }], DEFAULT_SETTINGS, "grownup", "2026-09-01T00:00:00.000Z");
    const merged = mergeBackups(newer, older);
    expect(merged.children[0]?.name).toBe("Ana");
    expect(merged.children[0]?.stars).toBe(9);
  });

  it("drops an unknown account type", () => {
    const parsed = parseBackup({ role: "admin", updatedAt: "2026-09-01T00:00:00.000Z", settings: {}, children: [] });
    expect(parsed?.role).toBe("grownup");
    expect(parseBackup(null)).toBeNull();
  });
});

describe("account prefs and privacy copy", () => {
  it("saves the teacher flag and leaves sync off", () => {
    const store = memory();
    saveAccountPrefs({ sync: false, role: "teacher" }, store);
    expect(loadAccountPrefs(store)).toEqual({ sync: false, role: "teacher" });
    expect(SYNC_LABEL).toBe("Back up & sync progress");
    expect(KIDS_NEVER_LOGIN).toMatch(/never log in/);
    expect(ACCOUNT_OFF.join(" ")).toMatch(/no sign-in setup/);
    expect(PRIVACY_LINES.join(" ")).toMatch(/Photos are not uploaded/);
    expect(PRIVACY_LINES.join(" ")).toMatch(/no ads and no tracking/);
    expect(PRIVACY_LINES.join(" ")).toMatch(/Delete account/);
  });

  it("explains a closed window and an offline phone", () => {
    expect(friendlyAuthError({ code: "auth/network-request-failed" })).toMatch(/offline/);
    expect(friendlyAuthError({ code: "auth/popup-closed-by-user" })).toMatch(/closed/);
    expect(friendlyAuthError(new Error("Enter the email and password."))).toBe("Enter the email and password.");
    expect(magicContinueUrl("https://example.com/Kids-app/?x=1#y")).toBe("https://example.com/Kids-app/");
  });

  it("does not ship analytics or an ads SDK", () => {
    const client = readFileSync(new URL("./firebaseClient.ts", import.meta.url), "utf8");
    const config = readFileSync(new URL("../../capacitor.config.ts", import.meta.url), "utf8");
    expect(client).not.toMatch(/firebase\/analytics|getAnalytics|gtag|admob/i);
    expect(config).toMatch(/apple\.com/);
    expect(config).toMatch(/google\.com/);
    expect(config).not.toMatch(/facebook/i);
  });
});
