import { expect, test, type Page } from "@playwright/test";
import { finishLetterTracing, traceCurrentStroke } from "./traceFlow";
import { createdThisWeek } from "./clock";
import { noting } from "./kit";

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
    },
  ],
};

async function openDraw(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Draw" }).click();
  await expect(page.locator("[data-screen=draw]")).toBeVisible();
}

test("tracing the letter path completes and a far stroke does not", async ({ page }, testInfo) => {
  await openDraw(page);
  const root = page.locator("[data-screen=draw]");
  await expect(root).toHaveAttribute("data-phase", "demo");
  const board = root.locator(".letter-board");
  await expect(board).toHaveCSS("touch-action", "none");
  await root.getByRole("button", { name: "Your turn" }).click();
  await expect(root).toHaveAttribute("data-phase", "trace");

  await board.scrollIntoViewIfNeeded();
  const box = await board.boundingBox();
  if (!box) throw new Error("The tracing board has no box");
  await page.mouse.move(box.x + 6, box.y + 6);
  await page.mouse.down();
  await page.mouse.move(box.x + 18, box.y + 10, { steps: 4 });
  await page.mouse.move(box.x + 8, box.y + box.height - 8, { steps: 4 });
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-covered", "0");
  await expect(root).toHaveAttribute("data-stroke-done", "false");

  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: "test-results/screenshots/letter_trace_board.png" });
  }
  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "test-results/screenshots/letter_trace_iphone.png" });
  }
  // A slow, careful finger first: one stroke, touching every station on the way. The ink
  // has to grow under it in many short steps and never go back. (The quick finger the rest
  // of the lesson uses makes a quarter as many, so a third of the stations tells them apart.)
  const stations = ((await board.getAttribute("data-stations")) ?? "").split(" ").length;
  await root.evaluate((screen) => {
    const steps: number[] = [];
    (window as Window & { __inkSteps?: number[] }).__inkSteps = steps;
    const note = () => steps.push(Number(screen.getAttribute("data-covered")));
    new MutationObserver(note).observe(screen, { attributes: true, attributeFilter: ["data-covered"] });
  });
  await traceCurrentStroke(page, "draw", "careful");
  // The board clears to 0 for the next stroke; only this stroke's ink counts.
  const ink = await page.evaluate(() => ((window as Window & { __inkSteps?: number[] }).__inkSteps ?? []).filter((covered) => covered > 0));
  expect(ink.length).toBeGreaterThan(stations / 3);
  expect(ink).toEqual([...ink].sort((a, b) => a - b));
  // The rest of the lesson with the quick finger the other tests use. Every station of all
  // twelve strokes took this test most of the way to the 30 s it gets in CI.
  await finishLetterTracing(page);
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("upper and lower letters can be matched by tap or drag", async ({ page }, testInfo) => {
  await openDraw(page);
  const root = page.locator("[data-screen=draw]");
  for (let step = 0; step < 40; step += 1) {
    const phase = await root.getAttribute("data-phase");
    if (phase === "match") break;
    if (phase === "demo") {
      await root.getByRole("button", { name: "Your turn" }).click();
    } else if (phase === "trace") {
      await traceCurrentStroke(page);
    } else if (phase === "cheer") {
      await root.getByRole("button", { name: "Match" }).click();
    } else {
      throw new Error(`Unexpected phase before matching: ${phase}`);
    }
  }
  await expect(root).toHaveAttribute("data-phase", "match");
  const letter = (await root.getAttribute("data-letter")) ?? "";
  const upper = root.locator(`[data-match-upper="${letter.toUpperCase()}"]`);
  const lower = root.locator(`[data-match-lower="${letter}"]`);
  const upperBox = await upper.boundingBox();
  const lowerBox = await lower.boundingBox();
  if (!upperBox || !lowerBox) throw new Error("Match cards have no box");
  await page.mouse.move(upperBox.x + upperBox.width / 2, upperBox.y + upperBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(lowerBox.x + lowerBox.width / 2, lowerBox.y + lowerBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(upper).toHaveAttribute("data-paired", "true");

  const otherLetter = (await root.locator("[data-match-upper][data-paired=false]").first().getAttribute("data-match-upper")) ?? "";
  const other = root.locator(`[data-match-upper="${otherLetter}"]`);
  // This pair is the last, and matching ends with it: a moment later the cards are gone and the
  // next step is on the page. So the page notes the pairing as it happens.
  const paired = await noting(root, (screen, letter) => screen.querySelector(`[data-match-upper="${letter}"]`)?.getAttribute("data-paired") ?? "gone", otherLetter);
  await other.click();
  await root.locator(`[data-match-lower="${otherLetter.toLowerCase()}"]`).click();
  await expect.poll(paired).toContain("true");

  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: "test-results/screenshots/letter_trace_match.png" });
  }
});

test("tracing fits an iPad in both orientations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "iPad size is checked once");
  await page.setViewportSize({ width: 768, height: 1024 });
  await openDraw(page);
  const board = page.locator(".letter-board");
  await expect(board).toBeVisible();
  await expect(board).toHaveCSS("touch-action", "none");
  const portrait = await board.boundingBox();
  expect(portrait && portrait.width).toBeGreaterThan(280);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(board).toBeVisible();
  const landscape = await board.boundingBox();
  expect(landscape && landscape.width).toBeGreaterThan(200);
  await page.screenshot({ path: "test-results/screenshots/letter_trace_ipad_landscape.png" });
});
