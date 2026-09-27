import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONSENT_TEXT } from "../data/aggregates";
import { emptyDesk, type SchoolClass, type SchoolDesk } from "./school";
import { deskOrCache, readSchoolCache, writeSchoolCache } from "./schoolCache";

const root = process.cwd();
const marker = "DRAFT - requires legal review before publishing";

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...walk(path));
    else found.push(path);
  }
  return found;
}

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("privacy surface", () => {
  it("imports Firebase auth and Firestore only", () => {
    const sources = walk(join(root, "src")).filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
    const banned = /firebase\/(analytics|crashlytics|remote-config|performance)/;
    for (const file of sources) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(banned);
    }
    const client = readFileSync(join(root, "src/auth/firebaseClient.ts"), "utf8");
    expect(client).toContain("firebase/auth");
    expect(client).toContain("firebase/firestore");
  });

  it("keeps both legal drafts marked and unwired", () => {
    for (const file of ["docs/privacy-coppa-draft.md", "docs/privacy-policy-draft.md"]) {
      const text = readFileSync(join(root, file), "utf8");
      expect(text.startsWith(marker)).toBe(true);
      expect(text).toContain("TriageDesk AI LLC");
      expect(text).toContain(CONSENT_TEXT);
    }
    const sources = walk(join(root, "src")).filter(
      (file) => (file.endsWith(".ts") || file.endsWith(".tsx")) && !file.endsWith(".test.ts"),
    );
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("privacy-policy-draft");
      expect(text).not.toContain("privacy-coppa-draft");
      expect(text).not.toContain(marker);
    }
  });

  it("puts PrivacyInfo.xcprivacy in the iOS app target", () => {
    const manifest = readFileSync(join(root, "ios/App/App/PrivacyInfo.xcprivacy"), "utf8");
    expect(manifest).toContain("<key>NSPrivacyTracking</key>");
    expect(manifest).toContain("<false/>");
    expect(manifest).toContain("NSPrivacyAccessedAPICategoryUserDefaults");
    expect(manifest).toContain("CA92.1");
    const project = readFileSync(join(root, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
    expect(project).toContain("PrivacyInfo.xcprivacy in Resources");
    expect(project).toContain("A7E1C0DE1FED796500168520 /* PrivacyInfo.xcprivacy in Resources */");
  });
});

describe("school cache", () => {
  it("round-trips teacher state and lets a preview desk win", () => {
    const storage = memory();
    const room = (name: string): SchoolClass => ({
      id: name,
      schoolId: "s1",
      name,
      code: "BUNNY-42",
      codeExpiresAt: "2026-10-01T00:00:00.000Z",
      parentCode: "NEST-18",
      teacherUid: "tea",
      childCount: 0,
      totalStars: 0,
      totalReadingMs: 0,
      children: [],
    });
    const desk: SchoolDesk = { ...emptyDesk(), classes: [room("Bunnies")] };
    writeSchoolCache(desk, storage);
    expect(readSchoolCache(storage)?.classes[0]?.name).toBe("Bunnies");
    const preview: SchoolDesk = { ...emptyDesk(), classes: [room("Kids Villa")] };
    expect(deskOrCache(preview, storage).classes[0]?.name).toBe("Kids Villa");
    expect(deskOrCache(null, storage).classes[0]?.name).toBe("Bunnies");
  });
});
