import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";
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
      ladder: { step: 1, successes: 0 },
    },
    {
      id: "j",
      name: "J",
      ageRange: "5",
      animal: "owl",
      createdAt: createdThisWeek(),
      stars: 0,
      days: {},
      ladder: { step: 1, successes: 0 },
    },
  ],
};

async function install(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
}

async function passGate(page: Page) {
  await answerGate(page, true);
}

/** Save is held for a moment after a tap so a double tap cannot save twice. */
async function saveChild(page: Page) {
  const save = page.getByRole("button", { name: "Save child" });
  await expect(save).not.toHaveAttribute("aria-busy", "true");
  await save.click();
}

async function openAddChild(page: Page) {
  await install(page);
  await page.getByRole("button", { name: /grown-ups/i }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Child profiles/ }).click();
  await page.getByRole("button", { name: "Add another child" }).click();
}

test("the animal picker offers twelve animals and marks the ones already picked", async ({ page }) => {
  await openAddChild(page);
  const picks = page.locator(".animal-pick");
  await expect(picks).toHaveCount(12);
  for (const id of ["pig", "penguin", "lion", "koala"]) {
    await expect(page.locator(`.animal-pick[data-animal=${id}]`)).toBeVisible();
  }
  await expect(page.locator(".animal-pick[data-animal=fox] .animal-taken")).toHaveText("Mia");
  await expect(page.locator(".animal-pick[data-animal=owl] .animal-taken")).toHaveText("J");
  await expect(page.locator(".animal-pick[data-animal=cat] .animal-taken")).toHaveCount(0);
  await expect(page.locator(".animal-pick[data-animal=fox]")).toHaveAttribute("aria-label", "Fox, also Mia's");
  await expect(page.locator(".animal-pick[data-animal=owl]")).toHaveAttribute("aria-label", "Owl, also J's");
  const boxes = await picks.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect()));
  for (const box of boxes) {
    expect(box.width).toBeGreaterThanOrEqual(64);
    expect(box.height).toBeGreaterThanOrEqual(64);
    expect(box.right).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
});

test("a second initial on the same animal is asked to change one of them", async ({ page }) => {
  await openAddChild(page);
  await page.getByLabel("First name or initial").fill("K");
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.locator(".animal-pick[data-animal=owl]").click();
  const mint = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--mint-card").trim());
  for (const picked of [page.getByRole("button", { name: "5", exact: true }), page.locator(".animal-pick[data-animal=owl]")]) {
    await expect(picked).toHaveAttribute("aria-pressed", "true");
    const background = await picked.evaluate((element) => getComputedStyle(element).backgroundColor);
    const [r, g, b] = mint.match(/[0-9a-f]{2}/gi)!.map((pair) => parseInt(pair, 16));
    expect(background).toBe(`rgb(${r}, ${g}, ${b})`);
  }
  await saveChild(page);
  await expect(page.locator(".field-error")).toHaveText(
    "Another child here is already called Owl. Pick a different animal, or add a first name.",
  );
  await expect(page.locator(".child-meta")).toHaveCount(2);

  await page.locator(".animal-pick[data-animal=penguin]").click();
  await expect(page.locator(".field-error")).toHaveCount(0);
  await saveChild(page);
  await expect(page.locator(".child-meta")).toHaveCount(3);
  await expect(page.getByText("Penguin", { exact: true })).toBeVisible();
});

test("the same first name on the same animal is asked to change the animal", async ({ page }) => {
  await openAddChild(page);
  await page.getByLabel("First name or initial").fill("Mia");
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.locator(".animal-pick[data-animal=fox]").click();
  await saveChild(page);
  await expect(page.locator(".field-error")).toHaveText("Another child here is already Mia the fox. Pick a different animal.");
  await page.locator(".animal-pick[data-animal=lion]").click();
  await saveChild(page);
  await expect(page.locator(".child-meta")).toHaveCount(3);
});
