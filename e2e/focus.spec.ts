import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { answerGate } from "./gate";
import { expectStar, game, onRound } from "./kit";

/**
 * Focus goes with the screen (src/input/focus.ts).
 *
 * The app swaps parts of one page in and out. The button that opened a screen went with the
 * old screen, and the browser then left the focus on nothing: on a keyboard the next Tab began
 * again at the top of the page, and a screen reader was told nothing about the new screen.
 * Dialogs opened over the page, but Tab still walked the page behind them. And inside a screen,
 * a button that goes away when it is pressed (a round's choices, "Read" on a story's cover) took
 * the focus with it. The tests here drive the app with keys, and all but the last-named one
 * (a finger's tap) fail without that file.
 */

const today = new Date().toLocaleDateString("en-CA");

function family(mia: Record<string, unknown> = {}) {
  return {
    activeId: "mia",
    profiles: [
      { id: "mia", name: "Mia", ageRange: "5", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {}, ladder: { step: 5, successes: 0 }, ...mia },
      { id: "leo", name: "Leo", ageRange: "4", animal: "bear", createdAt: createdThisWeek(), stars: 0, days: {}, ladder: { step: 2, successes: 0 } },
    ],
  };
}

async function install(
  page: Page,
  options: { mia?: Record<string, unknown>; settings?: Record<string, unknown>; quick?: boolean; lockedPreview?: boolean } = {},
) {
  await page.addInitScript(
    ({ saved, prefs, quick, lockedPreview }) => {
      if (sessionStorage.getItem("focus-seeded")) return;
      sessionStorage.setItem("focus-seeded", "1");
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
      localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false, ...prefs }));
      // No wait for the praise between rounds (a development-build switch, see e2e/kit.ts).
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
      if (lockedPreview) localStorage.setItem("littlenest-paywall-preview-v1", "1");
    },
    { saved: family(options.mia), prefs: options.settings ?? {}, quick: options.quick ?? false, lockedPreview: options.lockedPreview ?? false },
  );
  await page.goto("./");
}

/**
 * What has the focus, as "tag: name". "nothing" is the page body, which is where a browser
 * leaves the focus when the thing that had it is removed.
 */
async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const at = document.activeElement;
    if (!at || at === document.body) return "nothing";
    const name = (at.getAttribute("aria-label") ?? at.textContent ?? "").replace(/\s+/g, " ").trim();
    return `${at.tagName.toLowerCase()}: ${name}`;
  });
}

async function expectFocus(page: Page, what: string | RegExp) {
  if (typeof what === "string") await expect.poll(() => focused(page)).toBe(what);
  else await expect.poll(() => focused(page)).toMatch(what);
}

/** Pick the child and land on the home screen, by keyboard. */
async function openToday(page: Page) {
  await page.getByRole("button", { name: "Mia" }).press("Enter");
  await expectFocus(page, "h1: Today's lesson");
}

test("a new screen takes the focus to its heading, and Tab goes on into the screen", async ({ page }) => {
  await install(page);
  // Nothing is moved when the app first opens: a page opens the way a page opens.
  await expect(page.locator("[data-screen=start]")).toBeVisible();
  expect(await focused(page)).toBe("nothing");

  await openToday(page);
  await page.locator("[data-area=explore] [data-course=math]").press("Enter");
  await expectFocus(page, "h1: Numbers");
  // A heading is a place to start from, not a control: it is not a Tab stop and it shows no ring.
  const heading = page.locator("h1[data-section-title]");
  await expect(heading).toHaveAttribute("tabindex", "-1");
  expect(await heading.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("none");

  // Tab carries on from the heading into the page. It used to start again at the Grown-ups button.
  await page.keyboard.press("Tab");
  await expectFocus(page, "button: Count objects");
  await page.keyboard.press("Enter");
  await expectFocus(page, "h1: Count");
});

test("Back goes to the tile that was opened, so the next one is one Tab away", async ({ page }) => {
  await install(page, { quick: true });
  await openToday(page);
  await page.locator("[data-area=explore] [data-course=time]").press("Enter");
  await expectFocus(page, "h1: Time & Money");
  await page.locator("[data-activity=routine]").press("Enter");
  await expectFocus(page, "h1: My day");

  await page.getByRole("button", { name: "Back", exact: true }).press("Enter");
  await expectFocus(page, "button: My day");
  await page.keyboard.press("Tab");
  await expectFocus(page, "button: Clock");

  // A game that is played to its end comes back to its tile too.
  await page.locator("[data-activity=day]").press("Enter");
  const day = game(page, "day");
  for (let round = 0; round < 4; round += 1) {
    await onRound(day, round);
    await day.locator(`.pick[data-part=${await day.getAttribute("data-answer")}]`).press("Enter");
  }
  await expectStar(page);
  await expectFocus(page, "button: Day and night");

  // And the section's own Back goes to the section's tile on the home screen.
  await page.locator("[data-section-back]").press("Enter");
  await expectFocus(page, "button: LittleNest Time & Money");
});

test("the list of games does the same for the games inside it", async ({ page }) => {
  await install(page);
  await openToday(page);
  await page.locator("[data-dock=games]").press("Enter");
  await expectFocus(page, "h1: Games");
  await page.locator("[data-game-tile=rhyme]").press("Enter");
  await expectFocus(page, "h1: Rhyme Match");
  await page.getByRole("button", { name: "All games" }).press("Enter");
  await expectFocus(page, "button: Rhyme Match");
  await page.getByRole("button", { name: "Back", exact: true }).press("Enter");
  await expectFocus(page, "button: Games");
});

test("the grown-up check keeps the keyboard inside it, and Escape gives the focus back", async ({ page }) => {
  await install(page);
  await openToday(page);
  await page.getByRole("button", { name: "Grown-ups", exact: true }).press("Enter");
  const gate = page.locator("[data-gate]");
  await expect(gate).toBeVisible();
  // The answer box asked for the focus, and has it.
  await expectFocus(page, "input: Answer");
  // Tab goes round the check's own controls. (Check is off until something is typed.) It used
  // to go on to Switch child and the lesson behind the check.
  await page.keyboard.press("Tab");
  await expectFocus(page, "button: Cancel");
  await page.keyboard.press("Tab");
  await expectFocus(page, "input: Answer");
  await page.keyboard.press("Shift+Tab");
  await expectFocus(page, "button: Cancel");

  await page.keyboard.press("Escape");
  await expect(gate).toHaveCount(0);
  await expectFocus(page, "button: Grown-ups");
});

test("the grown-up pages take the focus in, back to the row that was opened, and out to the Grown-ups button", async ({ page }) => {
  await install(page);
  await openToday(page);
  await page.getByRole("button", { name: "Grown-ups", exact: true }).press("Enter");
  await answerGate(page, true);
  await expectFocus(page, "h1: Grown-ups");
  await page.getByRole("button", { name: /^Settings/ }).press("Enter");
  await expectFocus(page, "h2: Settings");
  // Back is the same button on every one of these pages, so it kept the focus: the row that
  // was opened is where the grown-up was.
  await page.getByRole("button", { name: "Back", exact: true }).press("Enter");
  await expectFocus(page, /^button: Settings/);
  await page.getByRole("button", { name: "Back", exact: true }).press("Enter");
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expectFocus(page, "button: Grown-ups");
});

for (const who of ["Parent", "Teacher"] as const) {
  test(`the ${who} page is named when it opens, and Back goes to the ${who} button`, async ({ page }) => {
    await install(page);
    await page.getByRole("button", { name: who, exact: true }).press("Enter");
    await answerGate(page, true);
    await expectFocus(page, `h1: ${who}`);
    if (who === "Teacher") {
      // A child's page, and back to that child's row in the class list.
      await page.locator("[data-open-child=leo]").press("Enter");
      await expectFocus(page, "h2: Leo");
      await page.locator("[data-action=all-children]").press("Enter");
      await expect(page.locator("[data-open-child=leo]")).toBeFocused();
    }
    await page.getByRole("button", { name: "Back", exact: true }).press("Enter");
    await expect(page.locator("[data-screen=start]")).toBeVisible();
    await expectFocus(page, `button: ${who}`);
  });
}

test("Escape on the remove-a-child sheet closes the sheet and nothing else", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Grown-ups", exact: true }).press("Enter");
  await answerGate(page, true);
  await page.getByRole("button", { name: /^Child profiles/ }).press("Enter");
  await expectFocus(page, "h2: Child profiles");
  // The second child's Remove: there are two buttons with that name on the page.
  const remove = page.locator("[data-confirm=ask]").nth(1);
  await remove.press("Enter");
  const sheet = page.locator("[data-remove-child=leo]");
  await expect(sheet).toBeVisible();
  // It opens on Cancel, the safe one, and Tab stays between its two buttons.
  await expectFocus(page, "button: Cancel");
  await page.keyboard.press("Tab");
  await expectFocus(page, "button: Remove");
  await expect(sheet.locator("[data-confirm=ready]")).toBeFocused();
  await page.keyboard.press("Tab");
  await expectFocus(page, "button: Cancel");

  // The page underneath has an Escape of its own (Back). It heard the same key, and the whole
  // page closed with the sheet.
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page.locator("[data-screen=grownups]")).toHaveAttribute("data-page", "profiles");
  await expect(remove).toBeFocused();
});

test("the end-of-lesson sheet keeps Tab off the lesson underneath", async ({ page }) => {
  await install(page, {
    mia: { days: { [today]: { reading: { letter: true, draw: true, story: false, moment: true } } } },
    settings: { extraChunks: 1 },
  });
  await openToday(page);
  await page.getByRole("button", { name: "Story" }).press("Enter");
  await page.getByRole("button", { name: "Read", exact: true }).click();
  for (let turn = 0; turn < 5; turn += 1) await page.getByRole("button", { name: "Next page" }).click();
  await page.getByRole("button", { name: "All done" }).click();

  const sheet = page.locator("[data-wrap-up]");
  await expect(sheet).toHaveAttribute("data-wrap-up", "lesson");
  await expectFocus(page, "button: One more");
  // Tab used to reach the tiles under the sheet, and Enter on one opened a lesson past the day's stop.
  await page.keyboard.press("Tab");
  await expectFocus(page, "button: All done");
  await page.keyboard.press("Tab");
  await expectFocus(page, "button: One more");
  await page.keyboard.press("Shift+Tab");
  await expectFocus(page, "button: All done");
  // Escape is not an answer to "One more?": the sheet stays.
  await page.keyboard.press("Escape");
  await expect(sheet).toBeVisible();

  // One more: back on the lesson, at the stop the child came from.
  await page.getByRole("button", { name: "One more" }).press("Enter");
  await expect(sheet).toHaveCount(0);
  await expectFocus(page, "button: Story");
});

test("a round's answer never leaves the keyboard on nothing: focus is on one of the new choices", async ({ page }) => {
  await install(page, { quick: true });
  await openToday(page);
  await page.locator("[data-area=explore] [data-course=math]").press("Enter");
  await page.locator("[data-activity=count]").press("Enter");
  const count = game(page, "count");
  const tray = count.locator(".game-tray");
  for (let round = 0; round < 3; round += 1) {
    await onRound(count, round);
    await tray.locator(`[data-pick="${await count.getAttribute("data-answer")}"]`).press("Enter");
    await onRound(count, round + 1);
    // The choices are new buttons each round. The one that was pressed has usually gone, and
    // the focus went with it, back to the top of the page. Now a choice of the new round has it.
    await expect
      .poll(() => tray.evaluate((node) => node.contains(document.activeElement) && document.activeElement?.matches(".pick") === true), { message: `after round ${round}` })
      .toBe(true);
  }
});

test("a story can be read from its cover to its end with the keyboard alone", async ({ page }) => {
  await install(page);
  await openToday(page);
  await page.getByRole("button", { name: "Story" }).press("Enter");
  const story = page.locator("[data-screen=story]");
  await expect(story).toHaveAttribute("data-page", "0");
  // From the title, Tab is Read.
  await page.keyboard.press("Tab");
  await expectFocus(page, "button: Read");
  // Read gives way to the first page. The focus goes to the first thing on that page, its first
  // word; it used to go to nothing, with the Grown-ups button as the next Tab.
  await page.keyboard.press("Enter");
  await expect(story).toHaveAttribute("data-page", "1");
  await expect(story.locator(".story-word").first()).toBeFocused();
  // On through the words to Next page.
  for (let step = 0; step < 40 && (await focused(page)) !== "button: Next page"; step += 1) await page.keyboard.press("Tab");
  await expectFocus(page, "button: Next page");

  // A key held down repeats. It turns one page, not every page.
  const repeats = await page.evaluate(() => {
    const seen: boolean[] = [];
    // The same place the app listens, added after it, so this hears each repeat once the app has dealt with it.
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.repeat) seen.push(event.defaultPrevented);
      },
      true,
    );
    (window as unknown as { __repeats: boolean[] }).__repeats = seen;
    return seen.length;
  });
  expect(repeats).toBe(0);
  await page.keyboard.down("Enter");
  await page.keyboard.down("Enter");
  await page.keyboard.down("Enter");
  await page.keyboard.up("Enter");
  await expect(story).toHaveAttribute("data-page", "2");
  expect(await page.evaluate(() => (window as unknown as { __repeats: boolean[] }).__repeats)).toEqual([true, true]);

  // Next page is the same button on every page, so it keeps the focus; on the last page it
  // gives way to The end, and All done has the focus.
  const pages = Number(await story.getAttribute("data-pages"));
  for (let turn = 2; turn <= pages; turn += 1) {
    await expect(story).toHaveAttribute("data-page", String(turn));
    await expectFocus(page, "button: Next page");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "The end" })).toBeVisible();
  await expectFocus(page, "button: All done");
  await page.keyboard.press("Enter");
  // Back on the lesson, at the stop the story was opened from.
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expectFocus(page, "button: Story");
});

test("a form that takes a button's place takes the focus, and gives it back", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Grown-ups", exact: true }).press("Enter");
  await answerGate(page, true);
  await page.getByRole("button", { name: /^Child profiles/ }).press("Enter");
  await expectFocus(page, "h2: Child profiles");
  const add = page.getByRole("button", { name: "Add another child" });
  await add.press("Enter");
  // The button has become the form. Its first box has the focus.
  await expect(page.locator("#child-name")).toBeFocused();
  await page.locator(".add-form").getByRole("button", { name: "Cancel" }).press("Enter");
  await expect(page.locator(".add-form")).toHaveCount(0);
  await expect(add).toBeFocused();
});

// This one pins what must not change, so it passes without src/input/focus.ts too.
test("a finger's tap moves nothing: only keys are followed inside a screen", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Story" }).click();
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(page.locator("[data-screen=story]")).toHaveAttribute("data-page", "1");
  // No box is focused for a child who tapped: nothing scrolls, and no keyboard comes up.
  expect(await focused(page)).toBe("nothing");
});

test("a cheer over the screen takes the focus, and hands it on to the tile the game was opened from", async ({ page }) => {
  await install(page, { quick: true, mia: { stars: 9, celebrated: [] } });
  await openToday(page);
  await page.locator("[data-area=explore] [data-course=time]").press("Enter");
  await page.locator("[data-activity=day]").press("Enter");
  const day = game(page, "day");
  for (let round = 0; round < 4; round += 1) {
    await onRound(day, round);
    await day.locator(`.pick[data-part=${await day.getAttribute("data-answer")}]`).press("Enter");
  }
  const cheer = page.locator("[data-milestone='10']");
  await expect(cheer).toBeVisible();
  await expectFocus(page, "button: Yay");
  // Its one button is all there is to Tab to.
  await page.keyboard.press("Tab");
  await expectFocus(page, "button: Yay");
  await page.keyboard.press("Escape");
  await expect(cheer).toHaveCount(0);
  await expectFocus(page, "button: Day and night");
});

test("the lock sheet and the check over it each keep to their own keys", async ({ page }) => {
  // Five weeks in with the full app not bought: the lesson holds at week 2 and shows a lock.
  const fiveWeeksAgo = new Date(new Date(createdThisWeek()).getTime() - 5 * 7 * 24 * 60 * 60 * 1000).toISOString();
  await install(page, { lockedPreview: true, mia: { createdAt: fiveWeeksAgo, ladder: { step: 1, successes: 0 } } });
  await openToday(page);
  const held = page.locator("[data-held=true]");
  await held.press("Enter");
  const sheet = page.locator("[data-screen=locked]");
  await expect(sheet).toBeVisible();
  const ask = sheet.getByRole("button", { name: "Grown-ups" });
  await expect(ask).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(sheet.getByRole("button", { name: "Back" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(ask).toBeFocused();

  // The check opens over the sheet. Escape closes the check; the sheet is still there.
  await page.keyboard.press("Enter");
  const gate = page.locator("[data-gate]");
  await expect(gate).toBeVisible();
  await expectFocus(page, "input: Answer");
  await page.keyboard.press("Escape");
  await expect(gate).toHaveCount(0);
  await expect(sheet).toBeVisible();
  await expect(ask).toBeFocused();

  // Escape again is the sheet's Back, and the lock that opened it has the focus once more.
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(held).toBeFocused();
});

for (const contrast of ["default", "high"] as const) {
  test(`the focus ring is ink and three pixels wide (${contrast} contrast)`, async ({ page }) => {
    await install(page, { settings: { highContrast: contrast === "high" } });
    await expect(page.locator(".app")).toHaveAttribute("data-contrast", contrast);
    // The first Tab stop: the Grown-ups button.
    await page.keyboard.press("Tab");
    await expectFocus(page, "button: Grown-ups");
    const ring = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement!);
      return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor, offset: style.outlineOffset };
    });
    // It was soft sage, 2.4 to 1 on the page. With high contrast on it was not drawn at all: the
    // setting's own thin outline on every button outranked it.
    expect(ring).toEqual({ style: "solid", width: "3px", color: contrast === "high" ? "rgb(16, 24, 40)" : "rgb(36, 48, 86)", offset: "3px" });
  });
}
