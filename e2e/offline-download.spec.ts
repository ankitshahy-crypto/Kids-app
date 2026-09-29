import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";
import { createdThisWeek } from "./clock";

/**
 * The offline download on the web: nothing is fetched until a child exists,
 * a connection that asks for less data is respected until a grown-up says
 * otherwise, and the panel says how much the download is.
 */

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

/** Sound clips the page asked for. Source modules under src/audio/ are not clips. */
function audioRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/audio/") && url.endsWith(".mp3")) urls.push(url);
  });
  return urls;
}

async function openOfflinePanel(page: Page) {
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await answerGate(page, true);
  await page.getByRole("button", { name: /Offline/ }).click();
  const panel = page.locator("[data-section=offline]");
  await expect(panel).toBeVisible();
  return panel;
}

test("a fresh visit with no child fetches no sound clips", async ({ page }) => {
  const audio = audioRequests(page);
  await page.addInitScript(() => {
    localStorage.removeItem("littlenest-profiles-v1");
    localStorage.removeItem("kids-app-profiles-v1");
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  });
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-offline", "waiting", { timeout: 15000 });
  await page.waitForTimeout(2500);
  expect(audio).toEqual([]);
  const panel = await openOfflinePanel(page);
  await expect(panel).toHaveAttribute("data-offline-hold", "no-child");
  await expect(panel.locator("[data-offline-note]")).toContainText("Add a child first");
  await expect(panel.getByRole("button", { name: "Download for offline" })).toBeDisabled();
  expect(audio).toEqual([]);
});

test("Low Data Mode holds the download until a grown-up starts it, and the panel says how big it is", async ({ page }) => {
  test.setTimeout(240000);
  const audio = audioRequests(page);
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
    Object.defineProperty(navigator, "connection", { value: { saveData: true, type: "wifi", effectiveType: "4g" }, configurable: true });
  }, profile);
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-offline", "waiting", { timeout: 15000 });
  await page.waitForTimeout(2500);
  expect(audio).toEqual([]);
  const panel = await openOfflinePanel(page);
  await expect(panel).toHaveAttribute("data-offline-hold", "saved-data");
  await expect(panel).toHaveAttribute("data-offline-size", /^About \d+ MB$/);
  await expect(panel.locator("[data-offline-note]")).toContainText("Low Data Mode");
  await expect(panel.locator("[data-offline-note]")).toContainText(/About \d+ MB/);
  // The size is this device's children: the shared clips and one animal's story lines, well under the whole set.
  const mb = Number((await panel.getAttribute("data-offline-size"))?.match(/\d+/)?.[0]);
  expect(mb).toBeGreaterThan(5);
  expect(mb).toBeLessThan(40);
  const button = panel.getByRole("button", { name: "Download now" });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(panel).toHaveAttribute("data-offline-state", "downloading", { timeout: 15000 });
  await expect.poll(() => audio.length, { timeout: 20000 }).toBeGreaterThan(0);
  // One pass, for this device's animal: no other hero's story lines are fetched.
  await expect.poll(() => audio.some((url) => url.includes("/audio/stories/")), { timeout: 180000 }).toBe(true);
  const heroes = audio.map((url) => url.match(/\/audio\/stories\/[a-z0-9-]+\/(?:title|p\d+)-([a-z]+)\.mp3$/)?.[1]).filter(Boolean);
  expect(new Set(heroes)).toEqual(new Set(["fox"]));
});

test("a good connection with a child starts one pass on its own", async ({ page }) => {
  const audio = audioRequests(page);
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
    Object.defineProperty(navigator, "connection", { value: { saveData: false, type: "wifi", effectiveType: "4g" }, configurable: true });
  }, profile);
  await page.goto("./");
  // The pass starts from the service worker's registration. A static build without one has nothing to start it.
  const registered = await page.evaluate(async () => Boolean("serviceWorker" in navigator && (await navigator.serviceWorker.getRegistration())));
  test.skip(!registered, "no service worker on this server");
  await expect(page.locator("html")).toHaveAttribute("data-offline", "working", { timeout: 15000 });
  await expect.poll(() => audio.length, { timeout: 30000 }).toBeGreaterThan(0);
});
