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

const placement = {
  version: 1,
  origin: "device",
  classId: "device-class",
  updatedAt: "2026-09-26T00:00:00.000Z",
  subjects: {
    time: {
      classDefault: { subject: "time", stageId: "day", weekIndex: 0 },
      byChildId: {},
    },
  },
};

async function install(page: Page) {
  await page.addInitScript(
    ({ saved, placed }) => {
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.removeItem("kids-app-silent-hint-v1");
    },
    { saved: profile, placed: placement },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Time & Money" }).click();
}

async function openPlay(page: Page, name: string) {
  await page.getByRole("button", { name: "Money play" }).click();
  await page.getByRole("button", { name }).click();
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

test("three jars earn coins and the save jar can reach the hat", async ({ page }, testInfo) => {
  await install(page);
  await openPlay(page, "Three jars");
  const play = page.locator("[data-screen=jars]");
  if (testInfo.project.name === "chromium") {
    await play.screenshot({ path: "test-results/screenshots/money_jars.png" });
  }
  await play.locator("[data-chore=tidy]").click();
  await play.locator("[data-chore=feed]").click();
  await play.locator("[data-chore=help]").click();
  await expect(play).toHaveAttribute("data-earned", "3");
  await play.locator("[data-jar=save]").click();
  await play.locator("[data-jar=save]").click();
  await play.locator("[data-jar=save]").click();
  await expect(play).toHaveAttribute("data-save", "3");
  await expect(play).toHaveAttribute("data-goal", "met");
  await play.locator("[data-finish=jars]").click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("kids-app-profiles-v1") ?? "")).toContain("hat-crown");
  await page.getByRole("button", { name: "Pilot focus" }).click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("the lemonade stand pays a coin for each cup served", async ({ page }, testInfo) => {
  await install(page);
  await openPlay(page, "Lemonade stand");
  const play = page.locator("[data-screen=lemonade]");
  if (testInfo.project.name === "chromium") {
    await play.screenshot({ path: "test-results/screenshots/money_lemonade.png" });
  }
  await play.locator("[data-serve=cup]").click();
  await play.locator("[data-serve=cup]").click();
  await expect(play).toHaveAttribute("data-earned", "2");
  await play.locator("[data-serve=cup]").click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
});

test("a snack that costs too much asks them to save", async ({ page }) => {
  await install(page);
  await openPlay(page, "Choose a snack");
  const play = page.locator("[data-screen=choose]");
  await expect(play).toHaveAttribute("data-wallet", "10");
  await play.locator("[data-snack=milk]").click();
  await expect(play).toHaveAttribute("data-wallet", "10");
  await expect(play.locator("[data-message=save]")).toHaveText("Let's save for it!");
  await play.locator("[data-snack=cookie]").click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
});

test("needs and wants sort without a wrong bin ending the game", async ({ page }) => {
  await install(page);
  await openPlay(page, "Needs and wants");
  const play = page.locator("[data-screen=needs]");
  await play.locator("[data-item=apple]").click();
  await play.locator("[data-bin=want]").click();
  await expect(play.locator("[data-bin=want]")).toHaveAttribute("data-wiggle", "true");
  await expect(play).toHaveAttribute("data-sorted", "0");
  await play.locator("[data-bin=need]").click();
  await play.locator("[data-item=milk]").click();
  await play.locator("[data-bin=need]").click();
  await play.locator("[data-item=cookie]").click();
  await play.locator("[data-bin=want]").click();
  await play.locator("[data-item=crown]").click();
  await play.locator("[data-bin=want]").click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
});

test("cards stay closed early, then a debit tap lowers the save jar", async ({ page }, testInfo) => {
  await install(page);
  await openPlay(page, "Pretend cards");
  await expect(page.locator("[data-screen=cards]")).toHaveAttribute("data-cards", "closed");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=money-play]")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Switch child" }).click();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Printables/ }).click();
  await page.getByRole("button", { name: "Time sheets" }).click();
  await expect(page.locator("[data-sheet=jars] [data-jar=save]")).toBeVisible();
  await expect(page.locator("[data-sheet=jars] [data-jar=spend]")).toBeVisible();
  await expect(page.locator("[data-sheet=jars] [data-jar=share]")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  const classTime = page.locator("[data-place=class-time]");
  await classTime.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(classTime).toHaveAttribute("data-stage", "cards");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Time & Money" }).click();
  await openPlay(page, "Pretend cards");
  const cards = page.locator("[data-screen=cards]");
  await expect(cards).toHaveAttribute("data-cards", "open");
  await expect(cards).toHaveAttribute("data-save", "4");
  if (testInfo.project.name === "chromium") {
    await cards.screenshot({ path: "test-results/screenshots/money_cards.png" });
  }
  await cards.locator("[data-card=debit]").click();
  await expect(cards).toHaveAttribute("data-save", "3");
  await cards.locator("[data-tap=card]").click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
});
