import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { openGame, openTimeMoney } from "./kit";

/** The painted props the page asked for that did not come back. */
function watchArt(page: Page): string[] {
  const missing: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/games/") && !response.ok()) missing.push(`${response.status()} ${response.url()}`);
  });
  return missing;
}

test("coins are the painted faces, copper for the penny and silver for the rest, with the number as text", async ({ page }) => {
  const missing = watchArt(page);
  const loaded = page.waitForResponse((response) => /\/games\/coin-(copper|silver)\.webp$/.test(response.url()) && response.ok());
  await openTimeMoney(page);
  const coins = await openGame(page, "coins");
  await loaded;
  const picks = coins.locator(".game-tray .pick .coin-art");
  await expect(picks).toHaveCount(3);
  for (const coin of await picks.all()) {
    const id = (await coin.getAttribute("data-coin-art")) ?? "";
    const cents = { penny: "1", nickel: "5", dime: "10", quarter: "25" }[id];
    await expect(coin.locator("image")).toHaveAttribute("data-coin-face", id === "penny" ? "copper" : "silver");
    await expect(coin.locator("image")).toHaveAttribute("href", new RegExp(`/games/coin-${id === "penny" ? "copper" : "silver"}\\.webp$`));
    await expect(coin.locator("text")).toHaveText(cents ?? "");
  }
  // A dime is still the smallest and a quarter the biggest: whichever three are shown, their faces
  // on the page are in that order of size (the size is the coin's, not the picture's).
  const order = ["dime", "penny", "nickel", "quarter"];
  const shown = await picks.evaluateAll((nodes) =>
    nodes.map((node) => ({ id: node.getAttribute("data-coin-art") ?? "", width: node.querySelector("image")!.getBoundingClientRect().width })),
  );
  const bySize = [...shown].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  for (let i = 1; i < bySize.length; i += 1) expect(bySize[i].width, `${bySize[i].id} is bigger than ${bySize[i - 1].id}`).toBeGreaterThan(bySize[i - 1].width);
  expect(missing).toEqual([]);
});

test("the garden is painted: the bed, the things to give, and the plant at each step", async ({ page }) => {
  const missing = watchArt(page);
  const saved = { activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} }] };
  await page.addInitScript(
    ({ saved }) => {
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
    },
    { saved },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-course=science]").click();
  await page.locator("[data-science=menu] [data-activity=life]").click();
  const frame = page.locator(".game-frame").first();
  const bed = frame.locator(".garden-bed");
  await expect(bed.locator("image").first()).toHaveAttribute("href", /\/games\/garden\/bed\.webp$/);
  // The three things to give are pictures, each loaded, and the bubble asks with the same picture.
  for (const need of ["seed", "water", "sun"]) {
    const art = frame.locator(`.pick[data-give=${need}] img.prop-art`);
    await expect(art).toHaveAttribute("src", new RegExp(`/games/garden/${need === "water" ? "can" : need}\\.webp$`));
    await expect.poll(() => art.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
  }
  await expect(bed.locator(".garden-need img.prop-art")).toHaveAttribute("data-prop", "seed");
  // Bare soil, then a seed, a sprout, a leafy plant: each step its own picture, rooted in the bed.
  await expect(bed.locator("[data-plant]")).toHaveCount(0);
  for (const [step, plant] of [["1", "seed"], ["2", "sprout"], ["3", "plant"]] as const) {
    await expect(frame).toHaveAttribute("data-ready", "true");
    const need = (await frame.getAttribute("data-need")) ?? "";
    await frame.locator(`.pick[data-give=${need}]`).click();
    await expect(bed).toHaveAttribute("data-grown", step);
    await expect(bed.locator("[data-plant]")).toHaveAttribute("data-plant", plant);
  }
  // And the flower, with the last thing it needs.
  await expect(frame).toHaveAttribute("data-ready", "true");
  await frame.locator(`.pick[data-give=${(await frame.getAttribute("data-need")) ?? ""}]`).click();
  await expect(bed.locator("[data-plant=flower]")).toHaveCount(1);
  expect(missing).toEqual([]);
});
