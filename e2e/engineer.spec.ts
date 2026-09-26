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

const older = {
  activeId: "mia",
  profiles: [{ ...profile.profiles[0], ageRange: "6-7" }],
};

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

test("Build sits on the home screen and a bridge can cross", async ({ page }, testInfo) => {
  await install(page);
  const build = page.locator("[data-course=build]");
  await expect(build).toBeVisible();
  await expect(build).toHaveAttribute("aria-label", "LittleNest Build");
  await build.click();
  const board = page.locator("[data-engineer=menu]");
  await expect(board).toHaveAttribute("data-level", "early");
  await expect(board.locator("[data-activity=balance]")).toHaveCount(0);
  await expect(board.locator("[data-activity=bridge]")).toBeVisible();
  const dock = await page.locator(".today-dock").boundingBox();
  const tile = await board.locator("[data-activity=float]").boundingBox();
  expect(tile!.y + tile!.height).toBeLessThan((dock?.y ?? 0) + 1);
  if (testInfo.project.name === "chromium" || testInfo.project.name === "iphone") {
    await page.locator("[data-screen=today]").screenshot({ path: `/opt/cursor/artifacts/build_home_${testInfo.project.name}.png` });
  }
  await board.locator("[data-activity=bridge]").click();
  const play = page.locator("[data-engineer=bridge]");
  await expect(page.locator("[data-tip=engineer-bridge-start]")).toBeVisible();
  await play.locator("[data-piece=block]").click();
  await play.locator("[data-piece=plank]").dragTo(play.locator("[data-slot='1']"));
  await expect(play).toHaveAttribute("data-slots", "block,plank");
  await play.locator("[data-test=bridge]").click();
  await expect(play).toHaveAttribute("data-outcome", "cross");
  if (testInfo.project.name === "chromium") {
    await play.screenshot({ path: "/opt/cursor/artifacts/build_bridge.png" });
  }
  await play.locator("[data-finish=bridge]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await page.locator("[data-course=reading]").click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("a narrow tower topples and a wide one reaches the nest", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-course=build]").click();
  await page.locator("[data-activity=tower]").click();
  const play = page.locator("[data-engineer=tower]");
  await play.locator("[data-piece=narrow]").click();
  await play.locator("[data-test=tower]").click();
  await expect(play).toHaveAttribute("data-outcome", "topple");
  await expect(play.locator(".build-again")).toHaveText("Try again.");
  await play.locator("[data-undo=tower]").click();
  await play.locator("[data-piece=wide]").click();
  await play.locator("[data-piece=medium]").click();
  await play.locator("[data-piece=narrow]").click();
  await play.locator("[data-test=tower]").click();
  await expect(play).toHaveAttribute("data-outcome", "reach");
  if (testInfo.project.name === "chromium") {
    await play.screenshot({ path: "/opt/cursor/artifacts/build_tower.png" });
  }
  await play.locator("[data-finish=tower]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("a higher ramp rolls farther and simple machines lift", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-course=build]").click();
  await page.locator("[data-activity=ramp]").click();
  const ramp = page.locator("[data-engineer=ramp]");
  await ramp.locator("[data-watch=roll]").click();
  await expect(ramp).toHaveAttribute("data-outcome", "short");
  await expect(ramp.locator(".build-again")).toHaveText("Try again.");
  await ramp.locator("[data-height='2']").click();
  await ramp.locator("[data-watch=roll]").click();
  await expect(ramp).toHaveAttribute("data-roll", "4");
  await expect(ramp).toHaveAttribute("data-outcome", "reach");
  if (testInfo.project.name === "chromium") {
    await ramp.screenshot({ path: "/opt/cursor/artifacts/build_ramp.png" });
  }
  await ramp.locator("[data-finish=ramp]").click();
  await page.locator("[data-activity=machines]").click();
  const machines = page.locator("[data-engineer=machines]");
  await machines.locator("[data-press=right]").click();
  await expect(machines.locator(".build-again")).toHaveText("Try again.");
  await machines.locator("[data-press=left]").click();
  await machines.locator("[data-rope=pull]").click();
  await machines.locator("[data-wheel=turn]").click();
  await expect(machines).toHaveAttribute("data-ready", "true");
  await machines.locator("[data-finish=machines]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "2");
});

test("a guess drops an object in the water", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-course=build]").click();
  await page.locator("[data-activity=float]").click();
  const play = page.locator("[data-engineer=float]");
  await play.locator("[data-guess=sink]").click();
  await expect(play.locator(".build-again")).toHaveText("Try again.");
  await play.locator("[data-guess=float]").click();
  await expect(play).toHaveAttribute("data-object", "rock");
  await play.locator("[data-guess=sink]").click();
  await expect(play).toHaveAttribute("data-object", "boat");
  await play.locator("[data-guess=float]").click();
  await expect(play.locator("[data-finish=float]")).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await play.screenshot({ path: "/opt/cursor/artifacts/build_float.png" });
  }
  await play.locator("[data-finish=float]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("ages 5 to 7 hear what went wrong, then balance the beam", async ({ page }, testInfo) => {
  await install(page, older);
  await page.locator("[data-course=build]").click();
  await expect(page.locator("[data-activity=balance]")).toBeVisible();
  await page.locator("[data-activity=bridge]").click();
  const bridge = page.locator("[data-engineer=bridge]");
  await expect(bridge).toHaveAttribute("data-level", "later");
  await bridge.locator("[data-piece=plank]").click();
  await bridge.locator("[data-piece=plank]").click();
  await bridge.locator("[data-piece=block]").click();
  await bridge.locator("[data-test=bridge]").click();
  await expect(bridge).toHaveAttribute("data-outcome", "sag");
  await expect(bridge.locator("[data-wrong=true]")).toContainText("What went wrong?");
  await expect(bridge.locator("[data-wrong=true]")).toContainText("Put a block in the middle.");
  await bridge.locator("[data-slot='0']").click();
  await bridge.locator("[data-slot='1']").click();
  await bridge.locator("[data-slot='2']").click();
  await bridge.locator("[data-slot='0']").click();
  await bridge.locator("[data-piece=plank]").click();
  await bridge.locator("[data-piece=block]").click();
  await bridge.locator("[data-piece=plank]").click();
  await expect(bridge).toHaveAttribute("data-slots", "plank,block,plank");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-activity=balance]").click();
  const beam = page.locator("[data-engineer=balance]");
  await beam.locator("[data-pos='-1']").click();
  await beam.locator("[data-weight='2']").click();
  await beam.locator("[data-pos='2']").click();
  await beam.locator("[data-weight='1']").click();
  await beam.locator("[data-test=balance]").click();
  await expect(beam).toHaveAttribute("data-outcome", "balance");
  if (testInfo.project.name === "chromium") {
    await beam.screenshot({ path: "/opt/cursor/artifacts/build_balance.png" });
  }
  await beam.locator("[data-finish=balance]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});
