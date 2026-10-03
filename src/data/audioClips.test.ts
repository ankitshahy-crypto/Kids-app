import { describe, expect, it } from "vitest";
import available from "./audioAvailable.json";
import manifest from "./audioManifest.json";
import recorded from "./audioRecorded.json";

/**
 * The app says every line from a recorded clip. These two checks keep the
 * clips and the lines together.
 *
 * Why they exist: the first phone test found lines with no clip, which the
 * phone then read in its own voice (a robotic one, on that phone), and clips
 * that said different words from the screen, because a line had been edited
 * after it was recorded. Either one now fails here until the "Voice clips
 * (Google)" workflow has been run, which makes what is missing or changed.
 */
type Cue = { file: string; say: string; source: string };
const book = manifest as unknown as Record<string, Record<string, Cue>>;
const onDisk = new Set<string>(available.files);
const recordedFrom = recorded as Record<string, string>;

function everyCue(): { kind: string; id: string; cue: Cue }[] {
  return Object.entries(book).flatMap(([kind, entries]) => Object.entries(entries).map(([id, cue]) => ({ kind, id, cue })));
}

describe("recorded clips", () => {
  it("has a clip for every line the app can say", () => {
    const missing = everyCue()
      .filter(({ cue }) => !onDisk.has(cue.file))
      .map(({ kind, id }) => `${kind}/${id}`);
    expect(missing, `No clip yet for ${missing.length} lines. Run the "Voice clips (Google)" workflow on this branch.`).toEqual([]);
  });

  it("has no clip recorded from words that have since changed", () => {
    const stale = everyCue()
      .filter(({ cue }) => onDisk.has(cue.file) && recordedFrom[cue.file] !== undefined && recordedFrom[cue.file] !== cue.say)
      .map(({ kind, id, cue }) => `${kind}/${id}: recorded "${recordedFrom[cue.file]}", now "${cue.say}"`);
    expect(stale, `These clips say old words. Run the "Voice clips (Google)" workflow on this branch.`).toEqual([]);
  });

  it("knows what every clip on disk was recorded from", () => {
    const unknown = [...onDisk].filter((file) => recordedFrom[file] === undefined);
    expect(unknown).toEqual([]);
  });
});
