import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { animals } from "./animals";
import { dailySurprise, surpriseManifestEntries } from "./surprise";
import { THEME_IDS } from "./themes";

describe("the daily surprise", () => {
  it("says its line with recorded clips: who came, then what they brought", () => {
    const withGift = dailySurprise("mia", "fox", ["space"], "2026-10-05");
    expect(withGift.line).toBe(`${withGift.visitorName} came to say hi, and brought a rocket!`);
    expect(withGift.clips.map((clip) => clip.say)).toEqual([`${withGift.visitorName} came to say hi!`, "And brought a rocket!"]);
    const plain = dailySurprise("mia", "fox", [], "2026-10-05");
    expect(plain.clips.map((clip) => clip.say)).toEqual([`${plain.visitorName} came to say hi!`]);
    // The visitor is another animal, the same one all day.
    expect(plain.visitor).not.toBe("fox");
    expect(dailySurprise("mia", "fox", [], "2026-10-05").visitor).toBe(plain.visitor);
  });

  it("has a clip in the list for every visitor and every gift", () => {
    const prompts = manifest.prompts as Record<string, { say: string; source: string; file: string }>;
    const entries = surpriseManifestEntries();
    expect(entries).toHaveLength(animals.length + THEME_IDS.length);
    for (const entry of entries) {
      expect(prompts[entry.id]?.say, entry.id).toBe(entry.say);
      expect(prompts[entry.id]?.file).toBe(`prompts/${entry.id}.mp3`);
    }
  });
});
