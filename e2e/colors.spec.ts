import { expect, test, type Locator, type Page } from "@playwright/test";

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
  await page.getByRole("button", { name: "LittleNest Colors" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-subject", "colors");
}

async function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const list = (window as Window & { __audioAttempts?: { kind: string; detail: string }[] }).__audioAttempts ?? [];
    return list.filter((item) => item.kind === "speech" || item.kind === "element").map((item) => item.detail.toLowerCase());
  });
}

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

async function dragBlob(blob: Locator, bucket: Locator) {
  await blob.dragTo(bucket, { targetPosition: { x: 80, y: 70 } });
}

async function stir(page: Page, bucket: Locator) {
  const box = await bucket.boundingBox();
  if (!box) throw new Error("missing bucket");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 24, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 24, y, { steps: 12 });
  await page.mouse.move(box.x + 24, y + 20, { steps: 8 });
  await page.mouse.up();
}

test("color names speak the color and accept the matching object", async ({ page }, testInfo) => {
  await install(page);
  if (testInfo.project.name === "iphone") {
    await page.locator("[data-screen=today]").screenshot({ path: "test-results/screenshots/colors-today-iphone.png" });
  }
  await page.getByRole("button", { name: "Hear a color" }).click();
  const play = page.locator("[data-screen=name]");
  const hear = await play.getAttribute("data-hear");
  expect(hear).toBeTruthy();
  const word = (hear ?? "").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  await expect(play.locator(`[data-color='${hear}'] .color-word`)).toHaveText(word);
  await expect(play.locator(`[data-color='${hear}'] .color-pattern`)).not.toHaveText("");
  await play.getByRole("button", { name: "Hear it" }).click();
  const wrong = play.locator(`[data-color]:not([data-color='${hear}'])`).first();
  await wrong.click();
  await expect(play).toHaveAttribute("data-tries", "1");
  await expect(play.locator("[data-feedback]")).toContainText("That one is");
  await play.locator(`[data-color='${hear}']`).click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  const lines = await spoken(page);
  expect(lines.some((line) => line.includes(hear ?? ""))).toBe(true);
});

for (const mix of [
  { left: "red", right: "yellow", result: "orange", title: "Orange" },
  { left: "blue", right: "yellow", result: "green", title: "Green" },
  { left: "red", right: "blue", result: "purple", title: "Purple" },
  { left: "red", right: "white", result: "light red", title: "Light red" },
] as const) {
  test(`mixing ${mix.left} and ${mix.right} makes ${mix.result}`, async ({ page }, testInfo) => {
    await install(page);
    await page.getByRole("button", { name: "Mix paints" }).click();
    const play = page.locator("[data-screen=mix]");
    const bucket = play.locator("[data-bucket]");
    await dragBlob(play.locator(`[data-blob='${mix.left}']`), bucket);
    await expect(play.locator(`[data-blob='${mix.left}'][data-in-bucket='true']`)).toBeVisible();
    await dragBlob(play.locator(`[data-blob='${mix.right}']`), bucket);
    await expect(play).toHaveAttribute("data-bucket-count", "2");
    await stir(page, bucket);
    await expect(play).toHaveAttribute("data-result", mix.result);
    await expect(play.locator("[data-mix-result] .color-word")).toHaveText(mix.title);
    await expect(play.locator("[data-mix-result] .color-pattern")).not.toHaveText("");
    if (testInfo.project.name === "iphone" && mix.result === "orange") {
      await play.screenshot({ path: "test-results/screenshots/colors-mix-iphone.png" });
    }
    const lines = await spoken(page);
    expect(lines.some((line) => line.includes(mix.result))).toBe(true);
    await play.getByRole("button", { name: "Keep this color" }).click();
    await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
    if (testInfo.project.name === "iphone" && mix.result === "orange") {
      await page.getByRole("button", { name: "Paint your animal" }).click();
      const paint = page.locator("[data-screen=paint]");
      await paint.locator("button[data-color='orange']").click();
      await expect(paint).toHaveAttribute("data-tint", "orange");
      await expect(paint.locator(".paint-caption")).toContainText("Orange");
      await paint.screenshot({ path: "test-results/screenshots/colors-paint-iphone.png" });
      await paint.getByRole("button", { name: "Save to sticker book" }).click();
      await page.getByRole("button", { name: "Stickers" }).click();
      await expect(page.locator("[data-kind=color][data-sticker='orange fox']")).toBeVisible();
    }
  });
}

test("coloring page and the color path are on the grown-up screens", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Switch child" }).click();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Printables/ }).click();
  await page.getByRole("button", { name: "Coloring page" }).click();
  await expect(page.locator("[data-sheet=coloring]")).toBeVisible();
  await expect(page.locator("[data-sheet=coloring] [data-color=red]")).toContainText("Red");
  await expect(page.locator("[data-sheet=coloring] [data-color=red]")).toContainText("stripes");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  const classColors = page.locator("[data-place=class-colors]");
  await classColors.getByRole("button", { name: "Mixing", exact: true }).click();
  await expect(classColors).toHaveAttribute("data-stage", "mixing");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-section=path-colors]")).toContainText("Color names");
  await expect(page.locator("[data-section=path-colors]")).toContainText("Mixing");
  await expect(page.locator("[data-color-stage]")).toHaveAttribute("data-color-stage", "mixing");
});
