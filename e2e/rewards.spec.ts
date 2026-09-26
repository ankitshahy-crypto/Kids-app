import { expect, test, type Locator, type Page } from "@playwright/test";

const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

type SavedProfile = {
  id: string;
  name: string;
  ageRange: string;
  animal: string;
  createdAt: string;
  stars: number;
  days: Record<string, unknown>;
  outfit?: { hat: string | null; scarf: string | null; glasses: string | null; color: string | null };
  stickers?: { kind: "letter" | "word"; label: string }[];
  nest?: { date: string; piece: "twig" | "egg" }[];
  celebrated?: number[];
};

function store(profile: SavedProfile) {
  return { activeId: profile.id, profiles: [profile] };
}

const mia = {
  id: "mia",
  name: "Mia",
  ageRange: "4",
  animal: "fox",
  createdAt: "2026-09-01T15:00:00.000Z",
  days: {},
};

async function openApp(page: Page, profile: SavedProfile) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, store(profile));
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
}

async function dragAcross(page: Page, track: Locator) {
  const box = await track.boundingBox();
  if (!box) throw new Error("The blend track has no box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, y, { steps: 48 });
  await page.mouse.up();
}

function solve(prompt: string): number {
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const word = prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? "";
  const value = WORDS[word];
  if (!value) throw new Error(`Could not read the grown-up check: ${prompt}`);
  return value;
}

async function passGate(page: Page) {
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const expected = solve(prompt);
  const buttons = dialog.locator(".gate-choice");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const value = Number(await buttons.nth(index).innerText());
    if (value === expected) {
      await buttons.nth(index).click();
      return;
    }
  }
  throw new Error("No matching choice");
}

test("finishing a step earns a star and unlocks a closet item", async ({ page }, testInfo) => {
  await openApp(page, { ...mia, stars: 0 });
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "0");
  await page.getByRole("button", { name: "Draw" }).click();
  await page.getByRole("button", { name: "All done" }).click();
  await expect(page.locator(".star-flight")).toBeVisible();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");

  await page.getByRole("button", { name: "Dress up" }).click();
  await expect(page.locator("[data-screen=closet]")).toBeVisible();
  const hat = page.locator("[data-item=hat-leaf]");
  const scarf = page.locator("[data-item=scarf-stripe]");
  await expect(hat).toHaveAttribute("data-unlocked", "true");
  await expect(scarf).toHaveAttribute("data-unlocked", "false");
  await expect(scarf).toContainText("3 stars");
  await hat.click();
  await expect(hat).toHaveAttribute("data-worn", "true");
  await expect(page.locator(".closet-hero .hero")).toHaveAttribute("data-hat", "hat-leaf");
  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "/opt/cursor/artifacts/closet-iphone.png" });
  }

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Story" }).click();
  await expect(page.locator(".placeholder .hero")).toHaveAttribute("data-hat", "hat-leaf");

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "My Nest" }).click();
  const nest = page.locator("[data-screen=nest]");
  await expect(nest).toContainText("A finished day adds a twig or an egg.");
  await expect(nest).not.toContainText(/streak|missed/i);
});

test("blending a word adds a sticker", async ({ page }, testInfo) => {
  await openApp(page, { ...mia, stars: 0 });
  await page.getByRole("button", { name: "Letters" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await dragAcross(page, page.locator(".blend-track"));
  await expect(page.locator(".activity")).toHaveAttribute("data-blended", "true");
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Stickers" }).click();
  const book = page.locator("[data-screen=stickers]");
  await expect(book).toBeVisible();
  const count = Number(await book.getAttribute("data-sticker-count"));
  expect(count).toBeGreaterThan(0);
  await expect(page.locator("[data-kind=letter]").first()).toBeVisible();
  if ((await page.locator("[data-kind=word]").count()) === 0) {
    await page.getByRole("button", { name: "Next page" }).click();
  }
  await expect(page.locator("[data-kind=word]").first()).toBeVisible();
  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "/opt/cursor/artifacts/sticker-book-iphone.png" });
  }
});

test("every 10 stars shows a cheer", async ({ page }) => {
  await openApp(page, { ...mia, stars: 9, celebrated: [] });
  await page.getByRole("button", { name: "Draw" }).click();
  await page.getByRole("button", { name: "All done" }).click();
  const cheer = page.locator("[data-milestone='10']");
  await expect(cheer).toBeVisible();
  await expect(cheer).toContainText("for trying");
  await page.getByRole("button", { name: "Yay" }).click();
  await expect(cheer).toBeHidden();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "10");
});

test("parent and teacher views list stars, stickers, and milestones", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, store({
    ...mia,
    stars: 12,
    stickers: [
      { kind: "letter", label: "m" },
      { kind: "word", label: "mat" },
    ],
    nest: [{ date: "2026-09-20", piece: "twig" }],
    celebrated: [10],
  }));
  await page.goto("./");

  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  const stars = page.locator("[data-section=stars]");
  await expect(stars).toContainText("12 stars");
  await expect(stars).toContainText("2 stickers");
  await expect(stars).toContainText("Recent milestones: 10 stars");

  await page.getByRole("button", { name: "Home Rewards" }).click();
  const rewards = page.locator("[data-section=rewards]");
  await expect(rewards).toContainText("never bought");
  await expect(rewards).toContainText("2 stickers");
  await expect(rewards).toContainText("1 nest");

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  const device = page.locator("[data-card=device]");
  await expect(device).toContainText("Mia");
  await expect(device.locator("[data-stars='12']")).toHaveText("12 stars");
  await expect(device.locator("[data-stickers='2']")).toHaveText("2 stickers");
  await expect(device).toContainText("Recent milestones: 10 stars");
});
