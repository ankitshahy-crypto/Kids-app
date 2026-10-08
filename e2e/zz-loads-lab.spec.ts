import { test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { DEVICES, openOn } from "./devices";

/**
 * The measuring bench (branch lab/**, never merged): the start screen, loaded over and over from
 * the dev server as the fit tests load it (a device's insets, a child saved, a game opened in
 * between), and what the page is showing when the child's face has not come within eight seconds.
 * One fit test waited out its minute for that face in CI, once.
 */
for (const round of [0, 1, 2, 3]) {
  test(`LAB the start screen, loaded many times (${round})`, async ({ page }, testInfo) => {
    test.setTimeout(600_000);
    const device = DEVICES["an iPhone 14"];
    await openOn(page, device);
    const failed: string[] = [];
    const errors: string[] = [];
    page.on("requestfailed", (request) => failed.push(`${request.failure()?.errorText ?? "failed"} ${request.url().replace(/^https?:\/\/[^/]+/, "").slice(0, 90)}`));
    page.on("response", (response) => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url().replace(/^https?:\/\/[^/]+/, "").slice(0, 90)}`); });
    page.on("pageerror", (error) => errors.push(String(error).slice(0, 200)));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text().slice(0, 200)); });
    const misses: unknown[] = [];
    const times: number[] = [];
    const doors = ["[data-course=build]", "[data-course=math]", "[data-course=time]", "[data-dock=games]"];
    for (let turn = 0; turn < 60; turn += 1) {
      const before = { failed: failed.length, errors: errors.length };
      const started = Date.now();
      await page.goto("./");
      try {
        await page.getByRole("button", { name: "Mia" }).click({ timeout: 8_000 });
        times.push(Date.now() - started);
        await page.locator("[data-dock=games]").waitFor({ timeout: 8_000 });
        // As the fit tests do between two loads: into a section and a game.
        await page.locator(doors[turn % doors.length]).click({ timeout: 5_000 });
        await page.locator("[data-screen=today] [data-activity], [data-game-tile]").first().click({ timeout: 5_000 });
        await page.waitForTimeout(150);
      } catch (error) {
        const seen = await page.evaluate(() => ({
          text: document.body.innerText.replace(/\s+/g, " ").slice(0, 260),
          screen: document.querySelector("[data-screen]")?.getAttribute("data-screen") ?? null,
          ready: document.readyState,
          root: document.getElementById("root")?.childElementCount ?? -1,
          scripts: document.scripts.length,
          profiles: (localStorage.getItem("littlenest-profiles-v1") ?? "").slice(0, 120),
        })).catch((problem) => ({ text: `could not ask the page: ${String(problem).slice(0, 120)}` }));
        misses.push({ turn, after: Date.now() - started, why: String(error).split("\n")[0].slice(0, 160), seen, failed: failed.slice(before.failed).slice(0, 8), errors: errors.slice(before.errors).slice(0, 6) });
      }
    }
    times.sort((a, b) => a - b);
    mkdirSync("lab-out", { recursive: true });
    writeFileSync(`lab-out/${testInfo.project.name}--loads${round}r${testInfo.repeatEachIndex}.json`, JSON.stringify({ misses, slowest: times.slice(-1), errorsInAll: [...new Set(errors)].slice(0, 3) }));
  });
}
