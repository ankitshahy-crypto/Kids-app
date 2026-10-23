#!/usr/bin/env node
/**
 * Release guard: fails when any audio manifest entry is tagged TESTFLIGHT-ONLY
 * (e.g. the Muse voice test). Set TESTFLIGHT_BUILD=1 for internal TestFlight builds.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data");
export function testflightOnlyEntries(dir = dataDir) {
  const hits = [];
  for (const name of readdirSync(dir).filter((f) => /^audio.*\.json$/.test(f))) {
    const text = readFileSync(join(dir, name), "utf8");
    if (!text.includes("TESTFLIGHT-ONLY")) continue;
    const json = JSON.parse(text);
    for (const [key, value] of Object.entries(json)) {
      if (JSON.stringify(value).includes("TESTFLIGHT-ONLY") || key.includes("TESTFLIGHT-ONLY")) hits.push(`${name}: ${key}`);
    }
  }
  return hits;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && existsSync(dataDir)) {
  const hits = testflightOnlyEntries();
  if (hits.length === 0) console.log("Release audio check: no TESTFLIGHT-ONLY clips.");
  else if (process.env.TESTFLIGHT_BUILD === "1") console.warn(`TESTFLIGHT_BUILD=1: allowing ${hits.length} TESTFLIGHT-ONLY clips. Not for App Store release.`);
  else {
    console.error(`Release blocked: ${hits.length} TESTFLIGHT-ONLY audio clips (first: ${hits[0]}). Set TESTFLIGHT_BUILD=1 only for internal TestFlight.`);
    process.exit(1);
  }
}
