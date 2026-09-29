#!/usr/bin/env node
/**
 * The service worker precaches the app shell only. Sound clips (77 MB) are
 * fetched into the runtime cache by the offline download, once a child
 * exists, so a first visit is quick and a phone on cellular is not surprised.
 * Run after `vite build`; fails when a clip slipped into the precache list.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const worker = join(root, "dist/sw.js");
if (!existsSync(worker)) {
  console.error("dist/sw.js is missing: run vite build first.");
  process.exit(1);
}
const text = readFileSync(worker, "utf8");
const clips = text.match(/[A-Za-z0-9_./-]+\.mp3/g) ?? [];
if (clips.length > 0) {
  console.error(`dist/sw.js precaches ${clips.length} sound clip${clips.length === 1 ? "" : "s"}; the shell only belongs there. First: ${clips[0]}`);
  process.exit(1);
}
const shell = text.match(/"url":"[^"]+"/g) ?? [];
console.log(`Precache holds ${shell.length} shell files and no sound clips.`);
