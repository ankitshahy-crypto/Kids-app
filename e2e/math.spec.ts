import { expect, test, type Page } from "@playwright/test";

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: "2026-09-01T15:00:00.000Z",
      stars: 0,
      days: {},
    },
  ],
};

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

async function install(page: Page) {
  await page.addInitScript((saved) => {
    const target = window as Window & { __audioAttempts?: { kind: string; detail: string }[] };
    target.__audioAttempts = [];
    const synth = window.SpeechSynthesis?.prototype;
    if (synth && typeof synth.speak === "function") {
      const speak = synth.speak;
      synth.speak = function (this: SpeechSynthesis, utterance: SpeechSynthesisUtterance) {
        target.__audioAttempts?.push({ kind: "speech", detail: utterance.text });
        return speak.call(this, utterance);
      };
    }
    const play = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function (this: HTMLAudioElement) {
      target.__audioAttempts?.push({ kind: "element", detail: this.currentSrc || this.src || "" });
      return play.apply(this);
    };
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Numbers" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-subject", "math");
}

async function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const list = (window as Window & { __audioAttempts?: { kind: string; detail: string }[] }).__audioAttempts ?? [];
    return list.filter((item) => item.kind === "speech" || item.kind === "element").map((item) => item.detail.toLowerCase());
  });
}

test("counting speaks each number as apples are tapped or dragged", async ({ page }, testInfo) => {
  await install(page);
  if (testInfo.project.name === "iphone") {
    await page.locator("[data-screen=today]").screenshot({ path: "/opt/cursor/artifacts/numbers-today-iphone.png" });
  }
  await page.getByRole("button", { name: "Count objects" }).click();
  const play = page.locator("[data-screen=count]");
  const target = Number(await play.getAttribute("data-target"));
  expect(target).toBeGreaterThan(0);
  expect(target).toBeLessThanOrEqual(10);
  const first = play.locator("[data-object='0']");
  await first.dragTo(first, { targetPosition: { x: 30, y: 20 } });
  for (let index = 0; index < target; index += 1) {
    const apple = play.locator(`[data-object='${index}']`);
    if ((await apple.getAttribute("data-counted")) !== "true") await apple.click();
  }
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  const lines = await spoken(page);
  expect(lines.some((line) => WORDS.some((word) => line.includes(word)))).toBe(true);
});

test("number recognition plays the number and accepts the matching tap", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Hear a number" }).click();
  const play = page.locator("[data-screen=know]");
  const hear = await play.getAttribute("data-hear");
  await play.getByRole("button", { name: "Hear it" }).click();
  const wrong = play.locator(`[data-number]:not([data-number='${hear}'])`).first();
  if (await wrong.count()) await wrong.click();
  await expect(play).toBeVisible();
  await play.locator(`[data-number='${hear}']`).click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  const lines = await spoken(page);
  expect(lines.some((line) => line.includes(WORDS[Number(hear)] ?? ""))).toBe(true);
});

test("number tracing follows the dots in order", async ({ page }, testInfo) => {
  await install(page);
  await page.getByRole("button", { name: "Trace a number" }).click();
  const play = page.locator("[data-screen=trace]");
  const digit = await play.getAttribute("data-digit");
  expect(Number(digit)).toBeGreaterThanOrEqual(0);
  if (testInfo.project.name === "iphone") {
    await play.screenshot({ path: "/opt/cursor/artifacts/number-trace-iphone.png" });
  }
  for (let guard = 0; guard < 12; guard += 1) {
    const next = play.locator("[data-trace-dot][data-next=true]");
    if ((await next.count()) === 0) break;
    await next.click();
  }
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  await page.getByRole("button", { name: "Stickers" }).click();
  await expect(page.locator(`[data-sticker='${digit}'][data-kind=number][data-subject=math]`)).toBeVisible();
});

test("shape matching finds the prompted shape, then tracing finishes it", async ({ page }, testInfo) => {
  await install(page);
  await page.getByRole("button", { name: "Match a shape" }).click();
  const play = page.locator("[data-screen=shape]");
  const prompt = await play.getAttribute("data-prompt");
  const wrong = play.locator(`[data-shape]:not([data-shape='${prompt}'])`).first();
  await wrong.click();
  await expect(play).toHaveAttribute("data-tries", "1");
  await play.locator(`[data-shape='${prompt}']`).click();
  await expect(play).toHaveAttribute("data-phase", "demo");
  const { finishPathTrace, scribbleCorner } = await import("./traceFlow");
  await play.getByRole("button", { name: "Your turn" }).click();
  await scribbleCorner(page, "shape");
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: "/opt/cursor/artifacts/shape_trace_board.png" });
  }
  await finishPathTrace(page, "shape");
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  await page.getByRole("button", { name: "Stickers" }).click();
  await expect(page.locator(`[data-sticker='${prompt}'][data-kind=shape][data-subject=math]`)).toBeVisible();
});

test("which has more selects the larger group", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Which has more" }).click();
  const play = page.locator("[data-screen=more]");
  const answer = await play.getAttribute("data-answer");
  const other = answer === "left" ? "right" : "left";
  await play.locator(`[data-side=${other}]`).click();
  await expect(play).toBeVisible();
  await play.locator(`[data-side=${answer}]`).click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
});

test("picture addition accepts the sum up to 5", async ({ page }, testInfo) => {
  await install(page);
  await page.getByRole("button", { name: "Add the groups" }).click();
  const play = page.locator("[data-screen=add]");
  const left = Number(await play.getAttribute("data-left"));
  const right = Number(await play.getAttribute("data-right"));
  const sum = Number(await play.getAttribute("data-answer"));
  expect(left + right).toBe(sum);
  expect(sum).toBeLessThanOrEqual(5);
  if (testInfo.project.name === "iphone") {
    await play.screenshot({ path: "/opt/cursor/artifacts/number-add-iphone.png" });
  }
  await play.locator(`[data-sum='${sum}']`).click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
});

async function passGate(page: Page) {
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  const expected = sum
    ? Number(sum[1]) + Number(sum[2])
    : (words[prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? ""] ?? 0);
  const choices = dialog.locator(".gate-choice");
  const count = await choices.count();
  for (let index = 0; index < count; index += 1) {
    if (Number(await choices.nth(index).innerText()) === expected) {
      await choices.nth(index).click();
      return;
    }
  }
  throw new Error(`No matching grown-up choice for: ${prompt}`);
}

test("number sheets and the class numbers place are on the grown-up screens", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Switch child" }).click();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Printables/ }).click();
  await page.getByRole("button", { name: "Number sheets" }).click();
  await expect(page.locator("[data-sheet=number]").first()).toBeVisible();
  await expect(page.locator("[data-sheet=counting]")).toBeVisible();
  await expect(page.locator("[data-sheet=counting] [data-count='2']")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  const classMath = page.locator("[data-place=class-math]");
  await classMath.getByRole("button", { name: "Adding", exact: true }).click();
  await expect(classMath).toHaveAttribute("data-stage", "adding");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-section=path-math]")).toContainText("Counting");
  await expect(page.locator("[data-section=path-math]")).toContainText("Adding");
  await expect(page.locator("[data-math-stage]")).toHaveAttribute("data-math-stage", "adding");
});

test("letters and numbers stay large on iPad", async ({ page }) => {
  await install(page);
  for (const size of [
    { width: 1024, height: 1366 },
    { width: 1366, height: 1024 },
  ]) {
    await page.setViewportSize(size);
    for (const name of ["LittleNest Words", "LittleNest Numbers"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(100);
      expect(box!.width).toBeGreaterThan(140);
    }
  }
});
