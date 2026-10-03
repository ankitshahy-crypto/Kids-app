import { installAudioSpy, spokenLines } from "./audioSpy";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { answerGate, openClassPlace } from "./gate";
import { createdThisWeek } from "./clock";

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

async function install(page: Page) {
  await installAudioSpy(page);
  await page.addInitScript((saved) => {
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
  return spokenLines(page);
}

async function passGate(page: Page) {
  await answerGate(page, true);
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
  // Hear it says the instruction, then the color.
  await play.getByRole("button", { name: "Hear it" }).click();
  await expect.poll(() => spoken(page), { timeout: 10000 }).toEqual(expect.arrayContaining(["tap the color you hear.", hear ?? ""]));
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
  // A section page has Back where the child's animal is on the reading path, so step back to the path first.
  await page.locator("[data-section-back]").click();
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 1600 });
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
  await openClassPlace(page);
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
