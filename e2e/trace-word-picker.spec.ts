import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";

/**
 * Trace a word's picker, for a child who has blended more words than fit on a phone's screen. The
 * trace screen turns touch scrolling off so a stroke never drags the page, and the picker, drawn by
 * the same screen, took that with it: the list was cut off at the bottom and a finger could not
 * reach the rest (a mouse wheel could). The picker is only tapped, so a finger may scroll it; the
 * tracing board that follows keeps the page still.
 */
const blended = "am at mat sat map tap pat pit sip sit tip pan pin man nap mad sad ant cat cot dot pot top mop".split(" ");
const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: createdThisWeek(),
      stars: 0,
      days: {},
      stickers: blended.map((label) => ({ subject: "reading", kind: "word", label })),
      ladder: { step: 3, successes: 0 },
    },
  ],
};

async function openPicker(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Trace a word" }).click();
  const picker = page.locator("[data-screen=word][data-phase=pick]");
  await expect(picker).toBeVisible();
  return picker;
}

test("a long list of blended words scrolls under a finger, and the tracing board after it does not", async ({ page, isMobile }, testInfo) => {
  const picker = await openPicker(page);
  const cards = picker.locator(".match-card");
  await expect(cards).toHaveCount(blended.length);
  // The picker lets a finger scroll the page up and down; the trace screen around it does not.
  expect(await picker.evaluate((element) => getComputedStyle(element).touchAction)).toBe("pan-y");
  if (["phone-size", "ipad-size"].includes(testInfo.project.name)) {
    await page.screenshot({ path: `test-results/screenshots/trace_word_picker_${testInfo.project.name}.png` });
  }
  const last = cards.last();
  const height = page.viewportSize()?.height ?? 0;
  const bottom = async () => Math.round((await last.boundingBox())!.y + (await last.boundingBox())!.height);
  if ((await bottom()) > height) {
    // More than fits: the screen body is the scroller, and the last word is reached.
    const body = page.locator(".screen-body");
    expect(await body.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
    if (isMobile) await body.evaluate((element) => element.scrollBy(0, 2000));
    else {
      await page.mouse.move(200, height / 2);
      await page.mouse.wheel(0, 2000);
    }
    await expect.poll(bottom).toBeLessThanOrEqual(height);
  }
  await last.click();
  const board = page.locator("[data-screen=word]");
  await expect(board).toHaveAttribute("data-word", blended[blended.length - 1]);
  expect(await board.evaluate((element) => getComputedStyle(element).touchAction)).toBe("none");
});
