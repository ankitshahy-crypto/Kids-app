import { expect, test, type Locator } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { createdThisWeek } from "./clock";

/**
 * The measuring bench (branch lab/**, never merged): Take me home, round by round, in WebKit beside
 * Chromium at the same sizes. Where each part of the game is, at the start of each round, with the
 * page at its top.
 */
async function roundOver(board: Locator, round: string | null) {
  await expect
    .poll(() => board.evaluateAll((frames, was) => frames.length === 0 || frames[0].getAttribute("data-finished") === "true" || frames[0].getAttribute("data-round") !== was, round), { timeout: 15_000 })
    .toBe(true);
}

test("LAB Take me home, round by round", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript((created) => {
    const mia = { id: "mia", name: "Mia", ageRange: "6-7", animal: "fox", createdAt: created, stars: 0, days: {} };
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [mia] }));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
    localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: true }));
    localStorage.setItem("littlenest-quick-rounds", "1");
    localStorage.setItem("littlenest-salt", "7");
  }, createdThisWeek());
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-course=code]").click();
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  await expect(board).toBeVisible();
  const out: Record<string, unknown> = {};
  for (let round = 0; round < 4; round += 1) {
    await expect(board).toHaveAttribute("data-round", String(round), { timeout: 15_000 });
    await expect(board).toHaveAttribute("data-home", "false");
    await page.waitForTimeout(400);
    const mode = (await board.getAttribute("data-mode")) ?? "";
    for (const state of ["open", "chip"]) {
      if (state === "chip") await page.locator(".grownup-tip-hide").click();
      await page.waitForTimeout(250);
      out[`${round} ${mode} ${state}`] = await board.evaluate((frame) => {
        for (let box: Element | null = frame; box; box = box.parentElement) if (box.scrollTop > 0) box.scrollTop = 0;
        const n = (v: number) => Math.round(v * 10) / 10;
        const box = (el: Element | null) => { if (!el) return null; const r = el.getBoundingClientRect(); return [n(r.left), n(r.top), n(r.width), n(r.height)]; };
        const tray = frame.querySelector(".game-tray")!;
        const rows = new Map<number, number>();
        for (const el of tray.querySelectorAll(":scope > .pick, :scope > button")) { const top = Math.round(el.getBoundingClientRect().top); rows.set(top, (rows.get(top) ?? 0) + 1); }
        return {
          frame: box(frame), scene: box(frame.querySelector(".game-scene")), tray: box(tray), plan: box(frame.querySelector(".code-plan")),
          go: box(frame.querySelector("[data-go]")), routine: box(frame.querySelector("[data-routine-pick]")),
          rows: [...rows.values()], cell: box(frame.querySelector(".code-cell")), tip: box(document.querySelector(".grownup-tip")), inner: [innerWidth, innerHeight],
        };
      });
    }
    await page.locator(".grownup-tip-chip").click();
    await page.waitForTimeout(150);
    // Play the round.
    const path = ((await board.getAttribute("data-path")) ?? "").split(",").filter(Boolean);
    if (mode === "predict") {
      const given = await board.locator(".code-chip[data-given=true]").count();
      await board.locator(`.pick [data-ending="${path.slice(given).join(",")}"]`).click();
      await expect(board.locator(".code-chip")).toHaveCount(path.length);
    } else {
      const routine = mode === "reuse" ? ((await board.getAttribute("data-routine")) ?? "").split(",") : [];
      const at = mode === "reuse" ? Number(await board.getAttribute("data-routine-at")) : -1;
      for (const [index, dir] of path.entries()) {
        if (mode === "reuse" && index >= at && index < at + routine.length) {
          if (index === at) await board.locator("[data-pick=routine]").click();
          continue;
        }
        await board.locator(`[data-arrow=${dir}]`).click();
      }
    }
    await board.locator("[data-go=run]").click();
    await roundOver(board, String(round));
  }
  mkdirSync("lab-out", { recursive: true });
  writeFileSync(`lab-out/${testInfo.project.name}--bird.json`, JSON.stringify(out));
});
