import { expect, test, type Page } from "@playwright/test";
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

const older = {
  activeId: "mia",
  profiles: [{ ...profile.profiles[0], ageRange: "6-7" }],
};

function overlaps(
  a: { x: number; y: number; width: number; height: number } | null,
  b: { x: number; y: number; width: number; height: number } | null,
) {
  return Boolean(
    a &&
      b &&
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y,
  );
}

async function install(page: Page, saved: unknown = profile) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, saved);
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
}

test("Science sits on the home screen and life cycles can be ordered", async ({ page }, testInfo) => {
  await install(page);
  const science = page.locator("[data-course=science]");
  await expect(science).toBeVisible();
  await expect(science).toHaveAttribute("aria-label", "LittleNest Science");
  await page.locator("[data-course=build]").click();
  await expect(page.locator("[data-engineer=menu] [data-activity=float]")).toHaveCount(0);
  await science.click();
  const board = page.locator("[data-science=menu]");
  await expect(board).toHaveAttribute("data-level", "early");
  await expect(board.locator("[data-activity=predict]")).toHaveCount(0);
  await expect(board.locator("[data-activity=chain]")).toHaveCount(0);
  await expect(board.locator("[data-activity=water]")).toHaveCount(0);
  await expect(board.locator("[data-activity=float]")).toBeVisible();
  const dock = await page.locator(".today-dock").boundingBox();
  const menu = await board.boundingBox();
  expect(overlaps(menu, dock)).toBe(false);
  if (testInfo.project.name === "chromium" || testInfo.project.name === "iphone") {
    await page.locator("[data-screen=today]").screenshot({ path: `test-results/screenshots/science_home_${testInfo.project.name}.png` });
  }
  await board.locator("[data-activity=life]").click();
  const play = page.locator("[data-science=life]");
  await expect(page.locator("[data-tip=science-life-start]")).toBeVisible();
  await play.locator("[data-piece=plant]").click();
  await expect(play.locator(".build-again")).toHaveText("Try again.");
  await expect(play).toHaveAttribute("data-order", "");
  await play.locator("[data-piece=seed]").dragTo(play.locator("[data-order-row=life]"));
  await expect(play).toHaveAttribute("data-order", "seed");
  for (const piece of ["sprout", "plant", "egg", "chick", "bird", "caterpillar", "chrysalis", "butterfly"]) {
    await play.locator(`[data-piece=${piece}]`).click();
  }
  await expect(play.locator("[data-finish=life]")).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await play.screenshot({ path: "test-results/screenshots/science_life.png" });
  }
  await play.locator("[data-finish=life]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await page.locator("[data-course=reading]").click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("homes, body parts, on-screen changes, weather, and senses", async ({ page }) => {
  await install(page);
  await page.locator("[data-course=science]").click();
  await page.locator("[data-activity=homes]").click();
  const homes = page.locator("[data-science=homes]");
  await homes.locator("[data-animal=fox]").dragTo(homes.locator("[data-place=den]"));
  await homes.locator("[data-animal=bird]").click();
  await homes.locator("[data-place=nest]").click();
  await homes.locator("[data-animal=fish]").click();
  await homes.locator("[data-place=pond]").click();
  await expect(homes).toHaveAttribute("data-round", "food");
  await homes.locator("[data-animal=fox]").click();
  await homes.locator("[data-place=berries]").click();
  await homes.locator("[data-animal=bird]").click();
  await homes.locator("[data-place=worm]").click();
  await homes.locator("[data-animal=fish]").click();
  await homes.locator("[data-place=plant]").click();
  await homes.locator("[data-finish=homes]").click();

  await page.locator("[data-activity=body]").click();
  const body = page.locator("[data-science=body]");
  await expect(body).toHaveAttribute("data-said", "Find the wing.");
  await body.locator("[data-part=beak]").click();
  await expect(body.locator(".build-again")).toHaveText("Try again.");
  await body.locator("[data-part=wing]").click();
  await body.locator("[data-part=beak]").click();
  await body.locator("[data-part=tail]").click();
  await expect(body.locator("[data-part=paw]")).toHaveCount(0);
  await body.locator("[data-finish=body]").click();

  await page.locator("[data-activity=change]").click();
  const change = page.locator("[data-science=change]");
  await change.locator("[data-act=warm]").click();
  await expect(change).toHaveAttribute("data-result", "water");
  await change.locator("[data-next=change]").click();
  await change.locator("[data-act=heat]").click();
  await expect(change).toHaveAttribute("data-result", "steam");
  await change.locator("[data-next=change]").click();
  await expect(change.locator("[data-grownup=true]")).toHaveText("Do this with a grown-up. Do not taste it.");
  await expect(change.getByRole("button", { name: /taste/i })).toHaveCount(0);
  await change.locator("[data-act=mix]").click();
  await expect(change).toHaveAttribute("data-result", "bubbles");
  await change.locator("[data-next=change]").click();
  await change.locator("[data-item=rock]").dragTo(change.locator("[data-bin=solid]"));
  await change.locator("[data-item=juice]").click();
  await change.locator("[data-bin=liquid]").click();
  await change.locator("[data-item=steam]").click();
  await change.locator("[data-bin=gas]").click();
  await change.locator("[data-finish=change]").click();

  await page.locator("[data-activity=weather]").click();
  const weather = page.locator("[data-science=weather]");
  await weather.locator("[data-cloth=hat]").dragTo(weather.locator("[data-wear-target=animal]"));
  await weather.locator("[data-season=summer]").click();
  await weather.locator("[data-cloth=coat]").click();
  await weather.locator("[data-season=spring]").click();
  await weather.locator("[data-cloth=scarf]").click();
  await weather.locator("[data-season=winter]").click();
  await weather.locator("[data-finish=weather]").click();

  await page.locator("[data-activity=senses]").click();
  const senses = page.locator("[data-science=senses]");
  await senses.locator("[data-listen=tweet]").click();
  for (const choice of ["bird", "rain", "drum", "bunny", "rock", "ice", "sun", "moon"]) {
    await senses.locator(`[data-choice=${choice}]`).click();
  }
  await senses.locator("[data-finish=senses]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "5");
});

test("a guess drops an object in the water", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-course=science]").click();
  await page.locator("[data-activity=float]").click();
  const play = page.locator("[data-science=float]");
  await play.locator("[data-guess=sink]").click();
  await expect(play.locator(".build-again")).toHaveText("Try again.");
  await play.locator("[data-guess=float]").click();
  await expect(play).toHaveAttribute("data-object", "rock");
  await play.locator("[data-guess=sink]").click();
  await expect(play).toHaveAttribute("data-object", "boat");
  await play.locator("[data-guess=float]").click();
  await expect(play.locator("[data-finish=float]")).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await play.screenshot({ path: "test-results/screenshots/science_float.png" });
  }
  await play.locator("[data-finish=float]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await page.locator("[data-course=reading]").click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("ages 5 to 7 predict, then order a food chain and the water cycle", async ({ page }, testInfo) => {
  await install(page, older);
  await page.locator("[data-course=science]").click();
  const board = page.locator("[data-science=menu]");
  await expect(board).toHaveAttribute("data-level", "later");
  await expect(board.locator("[data-activity=predict]")).toBeVisible();
  await expect(board.locator("[data-activity=paw]")).toHaveCount(0);
  await page.locator("[data-activity=predict]").click();
  const play = page.locator("[data-science=predict]");
  await expect(play.locator("[data-question=predict]")).toHaveText("What do you think will happen?");
  await play.locator("[data-guess=stay]").click();
  await expect(play).toHaveAttribute("data-revealed", "false");
  await expect(play.locator("[data-test=predict]")).toHaveCount(0);
  await expect(play.locator(".build-again")).toHaveText("Try again.");
  await play.locator("[data-guess=melt]").click();
  await play.locator("[data-test=predict]").click();
  await expect(play).toHaveAttribute("data-revealed", "melt");
  await play.locator("[data-next=predict]").click();
  await play.locator("[data-guess=grow]").click();
  await play.locator("[data-test=predict]").click();
  await play.locator("[data-next=predict]").click();
  await expect(play.locator("[data-grownup=true]")).toHaveText("Do this with a grown-up. Do not taste it.");
  await play.locator("[data-guess=bubbles]").click();
  await play.locator("[data-test=predict]").click();
  if (testInfo.project.name === "chromium") {
    await play.screenshot({ path: "test-results/screenshots/science_predict.png" });
  }
  await play.locator("[data-finish=predict]").click();

  await page.locator("[data-activity=chain]").click();
  const chain = page.locator("[data-science=chain]");
  await chain.locator("[data-piece=fox]").click();
  await expect(chain.locator(".build-again")).toHaveText("Try again.");
  await chain.locator("[data-piece=grass]").dragTo(chain.locator("[data-order-row=chain]"));
  await chain.locator("[data-piece=rabbit]").click();
  await chain.locator("[data-piece=fox]").click();
  await chain.locator("[data-finish=chain]").click();

  await page.locator("[data-activity=water]").click();
  const water = page.locator("[data-science=water]");
  for (const piece of ["puddle", "vapor", "cloud", "rain"]) {
    await water.locator(`[data-piece=${piece}]`).click();
  }
  await water.locator("[data-finish=water]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "3");
  await page.locator("[data-activity=body]").click();
  await expect(page.locator("[data-part=paw]")).toBeVisible();
});

test("the home dock stays on screen with Science", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone" && testInfo.project.name !== "pixel", "phone layout");
  await install(page);
  for (const course of ["reading", "math", "colors", "time", "build", "science"]) {
    await page.locator(`[data-course=${course}]`).click();
    const bottom = await page.locator("[data-dock=nest]").evaluate((el) => el.getBoundingClientRect().bottom);
    const height = page.viewportSize()?.height ?? 0;
    expect(bottom, course).toBeLessThanOrEqual(height - 2);
  }
  await install(page, older);
  await page.locator("[data-course=science]").click();
  const bottom = await page.locator("[data-dock=nest]").evaluate((el) => el.getBoundingClientRect().bottom);
  const height = page.viewportSize()?.height ?? 0;
  expect(bottom, "science later").toBeLessThanOrEqual(height - 2);
  const dock = await page.locator(".today-dock").boundingBox();
  const menu = await page.locator("[data-science=menu]").boundingBox();
  expect(overlaps(menu, dock)).toBe(false);
});
