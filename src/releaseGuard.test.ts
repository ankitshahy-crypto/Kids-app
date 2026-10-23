import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script without types
import { testflightOnlyEntries } from "../scripts/check-release-audio.mjs";

describe("release guards", () => {
  it.skipIf(process.env.TESTFLIGHT_BUILD === "1")("no TESTFLIGHT-ONLY audio unless TESTFLIGHT_BUILD=1", () => {
    expect(testflightOnlyEntries()).toEqual([]);
  });

  it("UnlockPanel is only used from GrownupsMenu, which sits behind ParentGate", () => {
    const users: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f) && !/\.test\./.test(f) && !p.endsWith("UnlockPanel.tsx") && /<UnlockPanel\b|from "\.\/UnlockPanel"|UnlockPanel"/.test(readFileSync(p, "utf8"))) users.push(p.replace(/\\/g, "/"));
      }
    };
    walk("src");
    expect(users).toEqual(["src/components/GrownupsMenu.tsx"]);
  });
});
