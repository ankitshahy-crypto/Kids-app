import { test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { createdThisWeek } from "./clock";

/**
 * Measurements, not checks: what each engine makes of the things the iPad layout leans on (a game
 * drawn larger with `zoom`, lengths in viewport and container units inside it, boxes read by the
 * page's own code). Each test writes what it measured to lab-out/, and the workflow prints it.
 */

function note(testInfo: TestInfo, name: string, data: unknown) {
  mkdirSync("lab-out", { recursive: true });
  writeFileSync(`lab-out/${testInfo.project.name}--${name}.json`, JSON.stringify(data));
}

async function open(page: Page, { age = "5", hatch = 3, tips = true }: { age?: string; hatch?: number; tips?: boolean } = {}) {
  const saved = { activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange: age, animal: "fox", createdAt: createdThisWeek(), stars: 2, days: {}, ladder: { step: 2, successes: 0 }, games: { hatch, hatches: 0, spins: 0 } }] };
  await page.addInitScript(
    ({ saved, tips }) => {
      if (sessionStorage.getItem("lab-seeded")) return;
      sessionStorage.setItem("lab-seeded", "1");
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
      localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: tips }));
      localStorage.setItem("littlenest-quick-rounds", "1");
    },
    { saved, tips },
  );
  await page.goto("./");
  await page.locator("button.who-pick").first().click();
  await page.locator("[data-dock=games]").waitFor();
}

const round = (value: number) => Math.round(value * 100) / 100;
const box = async (locator: Locator) => {
  const b = await locator.first().boundingBox();
  return b ? { x: round(b.x), y: round(b.y), w: round(b.width), h: round(b.height) } : null;
};

/** What the page's own code reads for an element: the numbers a game would do its sums with. */
const own = (locator: Locator) =>
  locator.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const h = el as HTMLElement;
    const s = getComputedStyle(el);
    const n = (v: number) => Math.round(v * 100) / 100;
    return { rect: { x: n(r.left), y: n(r.top), w: n(r.width), h: n(r.height) }, offset: { w: h.offsetWidth, h: h.offsetHeight, top: h.offsetTop, left: h.offsetLeft }, client: { w: h.clientWidth, h: h.clientHeight }, css: { width: s.width, height: s.height, zoom: (s as unknown as { zoom: string }).zoom, bottom: s.bottom } };
  });

test("units inside a game drawn larger", async ({ page }, testInfo) => {
  await open(page);
  await page.locator("[data-course=time]").click();
  await page.locator("[data-activity=shop]").click();
  const frame = page.locator(".game-frame");
  const scene = frame.locator(".game-scene");
  await scene.waitFor();
  await page.waitForTimeout(800);
  // One box of each unit, laid inside the scene.
  const units: Record<string, string> = {
    px100: "width:100px;height:100px",
    vw10: "width:10vw;height:10vh",
    svh10: "width:10svw;height:10svh",
    cq10: "width:10cqw;height:10cqh",
    pct10: "width:10%;height:10%",
    rem5: "width:5rem;height:5em",
    floor: "width:10px;height:calc(max(100cqh, 200cqw / 3) * 0.225)",
    floorPct: "width:10px;height:calc(100% * 0.225)",
  };
  await scene.evaluate((el, units) => {
    for (const [id, css] of Object.entries(units)) {
      const probe = document.createElement("div");
      probe.setAttribute("data-probe", id);
      probe.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;opacity:0;${css}`;
      el.appendChild(probe);
    }
  }, units);
  // And the same boxes outside the game, where nothing is enlarged.
  await page.evaluate((units) => {
    const host = document.createElement("div");
    host.setAttribute("data-probe-host", "plain");
    host.style.cssText = "position:fixed;left:0;top:0;width:460px;height:300px;container-type:size;pointer-events:none;opacity:0";
    for (const [id, css] of Object.entries(units)) {
      const probe = document.createElement("div");
      probe.setAttribute("data-plain", id);
      probe.style.cssText = `position:absolute;left:0;top:0;${css}`;
      host.appendChild(probe);
    }
    document.body.appendChild(host);
  }, units);
  const size = async (locator: Locator) => {
    const b = await locator.first().boundingBox();
    return b ? [round(b.width), round(b.height)] : null;
  };
  const css = (locator: Locator) => locator.first().evaluate((el) => [getComputedStyle(el).width, getComputedStyle(el).height]);
  const probes: Record<string, unknown> = {};
  for (const id of Object.keys(units)) {
    // In the game: as drawn, and as the style sheet's own numbers. Outside it (a 460 by 300 box, nothing enlarged): as drawn.
    probes[id] = { in: await size(scene.locator(`[data-probe=${id}]`)), css: await css(scene.locator(`[data-probe=${id}]`)), out: await size(page.locator(`[data-plain=${id}]`)) };
  }
  const thing = frame.locator(".shop-counter > :first-child");
  const sceneBox = (await scene.boundingBox())!;
  const thingBox = await thing.first().boundingBox();
  const stageBox = await frame.locator(".game-stage").first().boundingBox();
  const art = Math.max(sceneBox.height, (sceneBox.width * 2) / 3);
  note(testInfo, "units", {
    window: await page.evaluate(() => ({ inner: [innerWidth, innerHeight], dpr: devicePixelRatio, ua: (navigator.userAgent.match(/Version\/[\d.]+|Chrome\/[\d.]+/) ?? [""])[0], cq: CSS.supports("width", "1cqw") })),
    zoom: await frame.evaluate((el) => (getComputedStyle(el) as unknown as { zoom: string }).zoom),
    scene: [round(sceneBox.width), round(sceneBox.height)],
    sceneCss: await css(scene),
    stage: stageBox ? { h: round(stageBox.height), bottomGap: round(sceneBox.y + sceneBox.height - stageBox.y - stageBox.height) } : null,
    stageCssBottom: await frame.locator(".game-stage").first().evaluate((el) => getComputedStyle(el).bottom),
    floorVar: await scene.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--scene-floor")),
    thingDown: thingBox ? round(1 - (sceneBox.y + sceneBox.height - (thingBox.y + thingBox.height)) / art) : null,
    probes,
  });
});

const GAMES: [string, string, string][] = [
  ["count", "math", "count"],
  ["choose", "time", "choose"],
  ["shop", "time", "shop"],
  ["clock", "time", "clock"],
  ["balance", "build", "balance"],
  ["float", "science", "float"],
  ["hatch", "dock", "hatch"],
  ["memory", "dock", "memory"],
  ["feed", "dock", "feed"],
];

test("how each game sits on the screen", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const out: Record<string, unknown> = {};
  await open(page);
  for (const [name, section, id] of GAMES) {
    await page.goto("./");
    await page.locator("button.who-pick").first().click();
    if (section === "dock") {
      await page.locator("[data-dock=games]").click();
      await page.locator(`[data-game-tile=${id}]`).click();
    } else {
      await page.locator(`[data-course=${section}]`).click();
      await page.locator(`[data-activity=${id}]`).click();
    }
    const frame = page.locator(".game-frame");
    await frame.locator(".game-scene").waitFor();
    await page.waitForTimeout(700);
    const picks = await frame.locator(".game-tray .pick").all();
    let low = 0;
    for (const pick of picks) {
      const b = await pick.boundingBox();
      if (b && b.y + b.height > low) low = b.y + b.height;
    }
    const height = page.viewportSize()!.height;
    const sceneB = await frame.locator(".game-scene").boundingBox();
    const trayB = await frame.locator(".game-tray").first().boundingBox().catch(() => null);
    const tipB = await page.locator(".grownup-tip").first().boundingBox().catch(() => null);
    out[name] = [round(height - low), sceneB ? round(sceneB.height) : null, trayB ? round(trayB.height) : null, tipB ? round(tipB.height) : null, picks.length];
  }
  note(testInfo, "games", out);
});

test("the coding board and its tiles", async ({ page }, testInfo) => {
  await open(page, { age: "6-7" });
  await page.locator("[data-course=code]").click();
  await page.locator("[data-game-tile=bird]").click();
  const frame = page.locator(".game-frame[data-screen=bird]");
  await frame.locator(".game-scene").waitFor();
  await page.waitForTimeout(800);
  const stage = frame.locator(".code-stage");
  const field = frame.locator(".code-field");
  note(testInfo, "bird", {
    scene: await box(frame.locator(".game-scene")),
    // The page measures the stage (clientWidth, clientHeight) and sets the field's size in px from it.
    stage: { seen: await box(stage), own: await own(stage) },
    field: { seen: await box(field), own: await own(field), style: await field.getAttribute("style"), cols: await field.getAttribute("data-width") },
    pet: await box(frame.locator(".code-pet")),
    go: await box(frame.locator("[data-go]")),
    spare: round(page.viewportSize()!.height - ((await frame.locator("[data-go]").first().boundingBox())?.y ?? 0) - ((await frame.locator("[data-go]").first().boundingBox())?.height ?? 0)),
  });
});

test("the start screen and Today", async ({ page }, testInfo) => {
  await open(page);
  const height = page.viewportSize()!.height;
  const dock = await box(page.locator("[data-dock=nest]"));
  note(testInfo, "today", {
    dock,
    dockSpare: dock ? round(height - dock.y - dock.h) : null,
    path: await box(page.locator(".today-path, [data-screen=today] .path, .trail").first()).catch(() => null),
    explore: await box(page.locator("[data-area=explore]")),
    firstTile: await box(page.locator(".course-button")),
  });
});
