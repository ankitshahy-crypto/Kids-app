import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { answerGate } from "./gate";

/**
 * The app around the lessons: the start screen as its logo arrives, the installed app's own pages,
 * a browser that refuses its storage, a screen a third of an iPad wide, and the grown-up check
 * under the number pad.
 */

const mia = { activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} }] };

async function seed(page: Page, settings: Record<string, unknown> = {}) {
  await page.addInitScript(
    ({ saved, settings }) => {
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
      localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false, ...settings }));
    },
    { saved: mia, settings },
  );
}

/**
 * As inside the iPhone app. The app asks Capacitor whether it is native, and Capacitor reads the
 * message bridge the app's web view has, so that is what is put here. (The second line is for a
 * build where Capacitor is a stand-in that reads nothing.) No native plugin answers: the store
 * check fails as it does with no connection, which the app takes in its stride.
 */
async function asInstalledApp(page: Page) {
  await page.addInitScript(() => {
    const target = window as unknown as { webkit?: unknown; Capacitor?: unknown };
    target.webkit = { messageHandlers: { bridge: { postMessage: () => undefined } } };
    target.Capacitor = { isNativePlatform: () => true };
  });
}

async function openGrownups(page: Page) {
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await answerGate(page, true);
  await expect(page.locator("[data-screen=grownups]")).toBeVisible();
}

for (const [name, viewport] of [
  ["a phone", { width: 390, height: 844 }],
  ["an iPad", { width: 810, height: 1080 }],
] as const) {
  test(`on ${name} the children's faces stay where they are when the logo arrives after them`, async ({ page }) => {
    // The first thing a child does is tap their face. The logo above it is a picture, and a picture
    // can arrive after the page is drawn (always on a first visit to the website). It used to have
    // no height until it did, so the faces jumped down as it landed.
    await page.setViewportSize(viewport);
    await seed(page);
    let arrive: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (arrive = resolve));
    await page.route("**/icons/icon-512.png", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("./", { waitUntil: "domcontentloaded" });
    const face = page.getByRole("button", { name: "Mia" });
    await expect(face).toBeVisible();
    const logo = page.locator(".nest-logo");
    expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), "the logo has not arrived yet").toBe(false);
    const before = await face.boundingBox();
    arrive();
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const after = await face.boundingBox();
    expect(Math.abs(after!.y - before!.y), "how far the face moved").toBeLessThan(1);
    // And the logo is drawn square, in the place kept for it.
    const box = await logo.boundingBox();
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(1);
    // The tap still opens the child's day.
    await face.click();
    await expect(page.locator("[data-screen=today]")).toBeVisible();
  });
}

test("the installed app's Offline page is about the app: no browser, no other phone, nothing to download", async ({ page }) => {
  await seed(page);
  await asInstalledApp(page);
  await page.goto("./");
  await openGrownups(page);
  // The row says what is true there: the lessons came with the app.
  const row = page.getByRole("button", { name: /^Offline/ });
  await expect(row).toContainText("Everything is already on this device");
  await expect(row).not.toContainText("Download");
  await row.click();
  const offline = page.locator("[data-section=offline]");
  await expect(offline).toHaveAttribute("data-ready", "true");
  await expect(offline.locator("[data-offline-updates=store]")).toContainText("App Store");
  await expect(offline.locator(".offline-download")).toHaveCount(0);
  await expect(offline.locator(".offline-update")).toHaveCount(0);
  const words = (await offline.innerText()).toLowerCase();
  for (const word of ["safari", "android", "home screen", "browser", "download"]) expect(words, `the page says nothing of "${word}"`).not.toContain(word);
  // Printing is not offered where the page cannot print.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: /^Printables/ }).click();
  await expect(page.locator("[data-print=unavailable]")).toBeVisible();
  await expect(page.locator(".print-button")).toHaveCount(0);
});

test("on the web the Offline page still says how to keep the app, and the sheets still print", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await openGrownups(page);
  const row = page.getByRole("button", { name: /^Offline/ });
  await expect(row).toContainText("Download lessons for a flight");
  await row.click();
  const offline = page.locator("[data-section=offline]");
  await expect(offline.getByRole("heading", { name: "Add to Home Screen" })).toBeVisible();
  await expect(offline.locator("[data-offline-updates=store]")).toHaveCount(0);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: /^Printables/ }).click();
  await expect(page.locator(".print-button")).toBeVisible();
  await expect(page.locator("[data-print=unavailable]")).toHaveCount(0);
});

test("a browser that refuses its storage still opens the app, and the grown-ups are told nothing is kept", async ({ page }) => {
  // Safari with "Block All Cookies": the very mention of localStorage throws. The app used to open
  // on its error screen, and Try again brought the same screen back.
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
  });
  await page.goto("./");
  await expect(page.locator("[data-first-run=true]")).toContainText("Add your child to begin");
  // The visit works from end to end: a child is added and their day opens.
  await page.getByRole("button", { name: "Add a child", exact: true }).click();
  await answerGate(page, true);
  await expect(page.locator("[data-screen=parent]")).toBeVisible();
  await page.getByLabel("First name or initial").fill("Sam");
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Fox", exact: true }).click();
  await page.getByRole("button", { name: "Save child" }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await page.locator("[data-pin-skip=true]").click();
  // A lesson opens and a setting can be changed, both of which write.
  await page.locator("[data-step=letter]").click();
  await expect(page.locator(".blend-track")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await openGrownups(page);
  await expect(page.locator("[data-notice=storage]")).toContainText("not letting LittleNest save");
  await page.getByRole("button", { name: /^Settings/ }).click();
  await expect(page.locator("[data-setting=explore]")).toBeVisible();
});

test("a browser that does keep things shows no such notice", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await openGrownups(page);
  await expect(page.locator("[data-notice=storage]")).toHaveCount(0);
});

for (const width of [320, 360]) {
  test(`at ${width} points wide the Break button is clear of the Grown-ups pill, and each does its own thing`, async ({ page }) => {
    // A third of an iPad's screen (Slide Over) and the smallest phones.
    await page.setViewportSize({ width, height: 800 });
    await seed(page);
    await page.goto("./");
    await page.getByRole("button", { name: "Mia" }).click();
    const pill = page.locator(".grownups-launch");
    // Still named for a screen reader, though only its icon shows.
    await expect(pill).toHaveAccessibleName("Grown-ups");
    expect((await pill.boundingBox())!.width).toBeLessThanOrEqual(48);
    // On Today the star count is beside it, not under it.
    const apart = async (selector: string) => {
      const [a, b] = await Promise.all([page.locator(selector).boundingBox(), pill.boundingBox()]);
      expect(a, selector).toBeTruthy();
      expect(a!.x + a!.width, `${selector} ends before the pill begins`).toBeLessThanOrEqual(b!.x);
    };
    await apart("[data-screen=today] .star-count");
    await page.locator("[data-step=letter]").click();
    await apart("[data-break]");
    await apart("[data-hear-again]");
    await page.locator("[data-break]").click();
    await expect(page.locator("[data-screen=break]")).toBeVisible();
    await expect(page.locator("[data-gate]")).toHaveCount(0);
  });
}

test("on a wider phone the pill keeps its word", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator(".grownups-launch")).toContainText("Grown-ups");
  expect((await page.locator(".grownups-launch").boundingBox())!.width).toBeGreaterThan(100);
});

test("the grown-up check sits above where the number pad comes up, on the shortest phone", async ({ page }) => {
  // An iPhone SE: 667 points tall, of which the number pad and its bar take about the lower 260.
  await page.setViewportSize({ width: 375, height: 667 });
  await seed(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  const gate = page.locator("[data-gate]");
  await expect(gate).toBeVisible();
  for (const name of ["Check", "Cancel"]) {
    const box = await gate.getByRole("button", { name, exact: true }).boundingBox();
    expect(box!.y + box!.height, `${name} is above the pad`).toBeLessThanOrEqual(667 - 260);
  }
  // And the grown-up's reading copy is body-text size, not small print.
  await answerGate(page, true);
  await page.getByRole("button", { name: /^Privacy/ }).click();
  await expect(page.locator("[data-section=privacy] .adult-copy").first()).toHaveCSS("font-size", "16px");
});

test("the PIN typed at the check shows as dots, and a new PIN being chosen stays in view", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  // Choose a PIN in Settings: the digits can be read as they are typed.
  await openGrownups(page);
  await page.getByRole("button", { name: /^Settings/ }).click();
  const setting = page.locator("[data-setting=pin]");
  const choose = setting.getByLabel("New PIN");
  await choose.fill("2468");
  expect(await choose.evaluate((input) => getComputedStyle(input).getPropertyValue("-webkit-text-security"))).not.toBe("disc");
  await setting.getByRole("button", { name: "Save PIN", exact: true }).click();
  await expect(setting).toContainText("Saved on this device");
  // Back at the check, the PIN is asked for, and what is typed is hidden.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  const gate = page.locator("[data-gate=pin]");
  await expect(gate).toBeVisible();
  const entry = gate.getByLabel("4-digit PIN");
  await entry.fill("2468");
  await expect(entry).toHaveAttribute("data-pin", "entry");
  expect(await entry.evaluate((input) => getComputedStyle(input).getPropertyValue("-webkit-text-security"))).toBe("disc");
  await gate.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator("[data-screen=grownups]")).toBeVisible();
});
