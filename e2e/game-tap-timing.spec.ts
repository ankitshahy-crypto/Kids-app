import { expect, test, type Page } from "@playwright/test";
import { installAudioSpy } from "./audioSpy";
import { createdThisWeek } from "./clock";

// A phone, where a tap in these games was heard to say its word late, or twice, out of step with
// the picture's move.
test.use({ viewport: { width: 390, height: 844 } });

const profile = {
  activeId: "mia",
  profiles: [{ id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {}, ladder: { step: 2, successes: 0 } }],
};

type Line = { at: number; cues: string[] };
type Attempt = { kind: string; detail: string; at: number };

/** The word clips the page fetched, with when: a round loads its words as it opens, before any tap. */
function watchWordFetches(page: Page): { url: string; at: number }[] {
  const fetched: { url: string; at: number }[] = [];
  page.on("request", (request) => {
    if (/\/audio\/(words|prompts)\//.test(request.url())) fetched.push({ url: request.url(), at: Date.now() });
  });
  return fetched;
}

async function open(page: Page, id: string) {
  await installAudioSpy(page);
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
    const target = window as Window & { __lines?: Line[] };
    target.__lines = [];
    window.addEventListener("littlenest:line", (event) => {
      target.__lines?.push({ at: performance.now(), cues: (event as CustomEvent<string[]>).detail });
    });
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-dock=games]").click();
  await page.locator(`[data-game-tile=${id}]`).click();
  const frame = page.locator(`.game-frame[data-screen=${id}]`);
  await expect(frame).toHaveAttribute("data-round", "0");
  // The round's line is said first; a tap after it is the child's own.
  await page.waitForTimeout(3000);
  return frame;
}

const lines = (page: Page) => page.evaluate(() => (window as Window & { __lines?: Line[] }).__lines ?? []);
const attempts = (page: Page) => page.evaluate(() => (window as Window & { __audioAttempts?: Attempt[] }).__audioAttempts ?? []);
const now = (page: Page) => page.evaluate(() => performance.now());

test("Feed the Animal: a tapped picture lands on the plate at once, its name said once, loaded before the tap", async ({ page }) => {
  const fetched = watchWordFetches(page);
  const frame = await open(page, "feed");
  const target = await frame.getAttribute("data-target");
  const good = frame.locator(`.pick[data-letter="${target}"]`).first();
  const food = (await good.getAttribute("data-food")) ?? "";
  // The word was fetched as the round opened, not at the tap.
  const tapTime = Date.now();
  expect(fetched.some((item) => item.url.endsWith(`/words/${food}.mp3`) && item.at < tapTime), `words/${food}.mp3 fetched as the round opened`).toBe(true);
  const before = (await lines(page)).length;
  const tapped = await now(page);
  await good.click();
  // The picture is on the plate from the tap itself.
  await expect(good).toHaveAttribute("data-fed", "true");
  await expect(frame.locator(`.feed-bite[data-bite="${food}"]`)).toBeVisible();
  await page.waitForTimeout(2000);
  const said = (await lines(page)).slice(before);
  // One line, the word alone, asked within a breath of the tap. Not twice.
  expect(said.map((line) => line.cues)).toEqual([[expect.any(String)]]);
  expect(said[0].at - tapped).toBeLessThan(400);
  const word = said[0].cues[0];
  const spoken = (await attempts(page)).filter((item) => item.kind === "line" && item.detail === word);
  expect(spoken.length, "the word is asked for once").toBe(1);
});

test("Rhyme Match: the second picture says its own name as the pair goes to the found row, and 'They rhyme' comes once they are there", async ({ page }) => {
  const fetched = watchWordFetches(page);
  const frame = await open(page, "rhyme");
  const first = frame.locator(".pick[data-rhyme]").first();
  const pair = (await first.getAttribute("data-pair")) ?? "";
  const second = frame.locator(`.pick[data-pair="${pair}"]`).nth(1);
  const firstWord = (await first.getAttribute("data-word")) ?? "";
  const secondWord = (await second.getAttribute("data-word")) ?? "";
  // Both words, and the verdict, were fetched as the round opened.
  const opened = Date.now();
  for (const file of [`/words/${firstWord}.mp3`, `/words/${secondWord}.mp3`, "/prompts/play-rhyme-yes.mp3"]) {
    expect(fetched.some((item) => item.url.endsWith(file) && item.at < opened), `${file} fetched as the round opened`).toBe(true);
  }
  let before = (await lines(page)).length;
  await first.click();
  // Picked at once, and its name said, once.
  await expect(first).toHaveAttribute("data-chosen", "true");
  await page.waitForTimeout(1500);
  expect((await lines(page)).slice(before).map((line) => line.cues)).toEqual([[firstWord]]);

  before = (await lines(page)).length;
  const tapped = await now(page);
  await second.click();
  // The pair is in the found row from the tap itself.
  await expect(second).toHaveAttribute("data-matched", "true");
  await expect(frame.locator(`.rhyme-pair[data-pair="${pair}"]`)).toBeVisible();
  const landed = await now(page);
  await page.waitForTimeout(3500);
  const said = (await lines(page)).slice(before);
  // One line: the second picture's own name, then the verdict. The first name is not said again.
  expect(said.map((line) => line.cues)).toEqual([[secondWord, "They rhyme!"]]);
  expect(said[0].at - tapped).toBeLessThan(400);
  // "They rhyme!" starts after the pair has had its moment to land (its slide is 0.3 s).
  const verdict = (await attempts(page)).find((item) => item.kind === "clip" && /play-rhyme-yes/.test(item.detail) && item.at > tapped);
  expect(verdict, "the verdict was asked for").toBeTruthy();
  expect(verdict!.at - landed).toBeGreaterThan(300);
  expect((await attempts(page)).filter((item) => item.kind === "line" && item.detail === firstWord).length, "the first name, asked for once in all").toBe(1);
});
