import { expect, test, type Locator, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { expectStar, openGame, openTimeMoney } from "./kit";

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
  await expect(bed.locator("image:not([data-ground])").first()).toHaveAttribute("href", /\/games\/garden\/bed\.webp$/);
  // The bed stands on a patch of dug ground, painted too, behind it and wider than it.
  const ground = bed.locator("image[data-ground]");
  await expect(ground).toHaveAttribute("href", /\/games\/garden\/ground\.webp$/);
  const [groundBox, bedBox] = await Promise.all([ground.boundingBox(), bed.locator("image:not([data-ground])").first().boundingBox()]);
  expect(groundBox!.x).toBeLessThan(bedBox!.x);
  expect(groundBox!.x + groundBox!.width).toBeGreaterThan(bedBox!.x + bedBox!.width);
  expect(groundBox!.y + groundBox!.height).toBeGreaterThanOrEqual(bedBox!.y + bedBox!.height - 1);
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

test("the bills are the painted one, with the amount written on, the five turned lavender", async ({ page }) => {
  const missing = watchArt(page);
  // Week 11 names the bills along with the coins; salt 5 deals a nickel, a one and a five first.
  const loaded = Promise.all(["bill", "bill-five"].map((name) => page.waitForResponse((response) => response.url().endsWith(`/games/${name}.webp`) && response.ok())));
  await openTimeMoney(page, { week: 10, ageRange: "6-7", salt: 5 });
  const coins = await openGame(page, "coins");
  await expect(coins).toHaveAttribute("data-task", "name");
  await loaded;
  const picks = coins.locator(".game-tray .pick .coin-art");
  await expect(picks).toHaveCount(3);
  for (const [id, painting] of [["one", "bill"], ["five", "bill-five"]] as const) {
    const bill = coins.locator(`.game-tray .pick .coin-art[data-coin-art=${id}]`);
    await expect(bill).toHaveCount(1);
    await expect(bill.locator("image")).toHaveAttribute("href", new RegExp(`/games/${painting}\\.webp$`));
    await expect(bill.locator("image")).toHaveAttribute("data-bill-face", id);
    await expect(bill.locator("text").first()).toHaveText(id === "one" ? "1" : "5");
    // A bill is wider than it is tall, like the painting, at a coin's width.
    const box = await bill.locator("image").boundingBox();
    expect(box!.width / box!.height).toBeGreaterThan(1.6);
  }
  // The two paintings tell apart by colour: the one is green, the five lavender (more blue than green).
  const tones = await page.evaluate(async (names) => {
    const tone = async (name: string) => {
      const bitmap = await createImageBitmap(await (await fetch(`games/${name}.webp`)).blob());
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      const sum = [0, 0, 0];
      let seen = 0;
      for (let at = 0; at < data.length; at += 4) {
        if (data[at + 3] < 200) continue;
        sum[0] += data[at];
        sum[1] += data[at + 1];
        sum[2] += data[at + 2];
        seen += 1;
      }
      return sum.map((channel) => channel / seen);
    };
    return Promise.all(names.map(tone));
  }, ["bill", "bill-five"]);
  const [one, five] = tones;
  expect(one[1], "the one is green").toBeGreaterThan(one[2] + 6);
  expect(five[2], "the five is lavender").toBeGreaterThan(five[1] + 6);
  expect(missing).toEqual([]);
});

test("the sorting jars are the painted jar, with the coin to sort by on its label", async ({ page }) => {
  const missing = watchArt(page);
  const loaded = page.waitForResponse((response) => /\/games\/jar\.webp$/.test(response.url()) && response.ok());
  await openTimeMoney(page, { week: 4 });
  const coins = await openGame(page, "coins");
  await expect(coins).toHaveAttribute("data-task", "sort");
  await loaded;
  const jars = coins.locator(".game-tray .pick[data-jar]");
  await expect(jars).toHaveCount(4);
  for (const jar of await jars.all()) {
    const id = (await jar.getAttribute("data-jar")) ?? "";
    const glass = jar.locator("img.jar-glass");
    await expect(glass).toHaveAttribute("src", /\/games\/jar\.webp$/);
    await expect.poll(() => glass.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
    // The label is on the glass, in the jar's middle, and it is the coin the jar is for.
    await expect(jar.locator(".jar-label .coin-art")).toHaveAttribute("data-coin-art", id);
    const [glassBox, labelBox] = await Promise.all([glass.boundingBox(), jar.locator(".jar-label").boundingBox()]);
    expect(labelBox!.x).toBeGreaterThan(glassBox!.x);
    expect(labelBox!.x + labelBox!.width).toBeLessThan(glassBox!.x + glassBox!.width);
    expect(labelBox!.y).toBeGreaterThan(glassBox!.y + glassBox!.height * 0.2);
    expect(labelBox!.y + labelBox!.height).toBeLessThan(glassBox!.y + glassBox!.height);
    // A jar is taller than it is wide, as the painting is.
    expect(glassBox!.height / glassBox!.width).toBeGreaterThan(1.4);
  }
  expect(missing).toEqual([]);
});

test("the three jars are the painted jar, and the coins put in sit in its glass", async ({ page }) => {
  const missing = watchArt(page);
  await openTimeMoney(page);
  const jars = await openGame(page, "jars");
  for (const chore of ["tidy", "feed", "help"]) await jars.locator(`[data-chore=${chore}]`).click();
  await expect(jars.locator("[data-jar] img.jar-glass")).toHaveCount(3);
  for (const glass of await jars.locator("[data-jar] img.jar-glass").all()) {
    await expect(glass).toHaveAttribute("src", /\/games\/jar\.webp$/);
    await expect.poll(() => glass.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
  }
  await jars.locator("[data-jar=save]").click();
  await jars.locator("[data-jar=save]").click();
  await expect(jars.locator("[data-jar=save] .jar-coins .coin-art")).toHaveCount(2);
  await expectCoinsInGlass(jars.locator("[data-jar=save]"));
  expect(missing).toEqual([]);
});

/** The coins in a jar lie in the bottom of its glass: inside the jar's sides, in its lower half, above its bottom. */
async function expectCoinsInGlass(jar: Locator) {
  const [glass, coins] = await Promise.all([jar.locator("img.jar-glass").boundingBox(), jar.locator(".jar-coins").boundingBox()]);
  expect(coins!.y).toBeGreaterThan(glass!.y + glass!.height / 2);
  expect(coins!.y + coins!.height).toBeLessThan(glass!.y + glass!.height);
  for (const coin of await jar.locator(".jar-coins .coin-art").all()) {
    const box = await coin.boundingBox();
    expect(box!.x).toBeGreaterThan(glass!.x + glass!.width * 0.08);
    expect(box!.x + box!.width).toBeLessThan(glass!.x + glass!.width * 0.92);
  }
}

test("the cards game's save jar starts with four coins, and they fit in its glass", async ({ page }) => {
  // The last week of the course opens the cards; its save jar holds four.
  await openTimeMoney(page, { week: 15, ageRange: "6-7" });
  const cards = await openGame(page, "cards");
  await expect(cards).toHaveAttribute("data-save", "4");
  const jar = cards.locator(".pick[data-jar=save]");
  await expect(jar.locator(".jar-coins .coin-art")).toHaveCount(4);
  await expect.poll(() => jar.locator("img.jar-glass").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
  await expectCoinsInGlass(jar);
});

/** Through the garden to the life put in order; `salt` picks which life (a development-build switch). */
async function openLifeInOrder(page: Page, salt: number) {
  const saved = { activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} }] };
  await page.addInitScript(
    ({ saved, salt }) => {
      if (sessionStorage.getItem("art-seeded")) return;
      sessionStorage.setItem("art-seeded", "1");
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      localStorage.setItem("littlenest-quick-rounds", "1");
      localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
      localStorage.setItem("littlenest-salt", String(salt));
    },
    { saved, salt },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-course=science]").click();
  await page.locator("[data-science=menu] [data-activity=life]").click();
  const frame = page.locator(".game-frame[data-screen=life]");
  await expect(frame).toBeVisible();
  for (let step = 0; step < 4; step += 1) {
    await expect(frame).toHaveAttribute("data-ready", "true");
    await frame.locator(`.pick[data-give=${(await frame.getAttribute("data-need")) ?? ""}]`).click();
  }
  await expect(frame).toHaveAttribute("data-task", "order");
  return frame;
}

test("the plant's life is put in order with the painted seed, sprout and flower", async ({ page }) => {
  const missing = watchArt(page);
  // Salt 3 deals the plant's life: its three pictures are the paintings, loaded.
  const plant = await openLifeInOrder(page, 3);
  await expect(plant).toHaveAttribute("data-cycle", "plant");
  for (const [art, painting] of [["seed", "seed"], ["sprout", "sprout"], ["flower", "bloom"]] as const) {
    const picture = plant.locator(`.game-tray .pick[data-pick=${art}] img.prop-art`);
    await expect(picture).toHaveAttribute("data-prop", art);
    await expect(picture).toHaveAttribute("src", new RegExp(`/games/garden/${painting}\\.webp$`));
    await expect.poll(() => picture.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
  }
  await expect(plant.locator(".game-tray .pick svg.art")).toHaveCount(0);
  // Put in place, each is the same painting on the line (the third ends the game, so is not looked for).
  for (const art of ["seed", "sprout"]) {
    await expect(plant).toHaveAttribute("data-ready", "true");
    await plant.locator(`.pick[data-pick=${art}]`).click();
    await expect(plant.locator(`.order-line li[data-filled=true] img.prop-art[data-prop=${art}]`)).toHaveCount(1);
  }
  await expect(plant).toHaveAttribute("data-ready", "true");
  await plant.locator(".pick[data-pick=flower]").click();
  await expectStar(page);
  expect(missing).toEqual([]);
});

test("the hen's life, which has no paintings yet, is put in order with drawings", async ({ page }) => {
  const hen = await openLifeInOrder(page, 0);
  await expect(hen).toHaveAttribute("data-cycle", "hen");
  await expect(hen.locator(".game-tray .pick img.prop-art")).toHaveCount(0);
  await expect(hen.locator(".game-tray .pick svg.art")).toHaveCount(3);
});
