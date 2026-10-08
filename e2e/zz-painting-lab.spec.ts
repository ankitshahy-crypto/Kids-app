import { test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { child, game, timePlacement } from "./kit";

/**
 * The measuring bench (branch lab/**, never merged): a game's painting the first time the game is
 * opened in a visit, and whether it comes in. One test saw Paint's painting stay out in WebKit.
 *
 * The first time a game's code is asked for, React lays the game out and holds it back a moment
 * behind "Loading"; a picture's load in that moment is let go by React. Each round here loads the
 * app afresh and opens one game, and writes down whether its painting came in within four seconds,
 * and when each picture was made (its address set), put on the page, and loaded, from the tap.
 */
const ROUNDS = Number(process.env.LAB_ROUNDS ?? 30);
const GAMES = {
  paint: { door: "LittleNest Colors", activity: "paint", painting: "room" },
  shop: { door: "LittleNest Time & Money", activity: "shop", painting: "shop" },
} as const;

async function watch(page: Page) {
  await page.addInitScript(() => {
    type Rec = { src: string; set: number; complete0?: boolean; put?: number; load?: number; onPage?: boolean; error?: number; loads?: [number, boolean][] };
    const w = window as unknown as { __imgs: { el: HTMLImageElement; rec: Rec }[]; __t0: number; __loading: [string, number][] };
    w.__imgs = [];
    w.__t0 = 0;
    w.__loading = [];
    const set = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
      if (this instanceof HTMLImageElement && name === "src" && /backdrops\//.test(String(value)) && !(this as unknown as { __watched?: boolean }).__watched) {
        (this as unknown as { __watched?: boolean }).__watched = true;
        const el = this;
        const rec: Rec = { src: String(value).split("/").pop() ?? "", set: performance.now() };
        w.__imgs.push({ el, rec });
        queueMicrotask(() => { rec.complete0 = el.complete; });
        el.addEventListener("load", () => { rec.load = performance.now(); rec.onPage = el.isConnected; (rec.loads ??= []).push([performance.now(), el.isConnected]); });
        el.addEventListener("error", () => { rec.error = performance.now(); });
      }
      return set.call(this, name, value);
    } as typeof Element.prototype.setAttribute;
    addEventListener("pointerdown", () => { w.__t0 = performance.now(); }, { capture: true });
    const isLoading = (node: Element) => [node, ...node.querySelectorAll("p.adult-copy")].some((p) => p.matches("p.adult-copy") && p.textContent === "Loading");
    new MutationObserver((list) => {
      const now = performance.now();
      for (const change of list) {
        for (const node of change.addedNodes) {
          if (!(node instanceof Element)) continue;
          for (const img of [node, ...node.querySelectorAll("img")]) {
            const hit = w.__imgs.find((x) => x.el === img);
            if (hit && hit.rec.put === undefined) hit.rec.put = now;
          }
          if (isLoading(node)) w.__loading.push(["in", now]);
        }
        for (const node of change.removedNodes) if (node instanceof Element && isLoading(node)) w.__loading.push(["out", now]);
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

// "fetched first": the painting is fetched (and decoded) before the game is opened, as a picture
// from the device is there almost at once.
for (const [name, which] of Object.entries(GAMES)) for (const first of [false, true]) {
  test(`LAB ${name}: its painting, the first time the game is opened in a visit${first ? ", fetched first" : ""}`, async ({ page, baseURL }, testInfo) => {
    test.setTimeout(900_000);
    await watch(page);
    await page.addInitScript(
      ({ saved, placed }) => {
        if (sessionStorage.getItem("painting-seeded")) return;
        sessionStorage.setItem("painting-seeded", "1");
        localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
        localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
        localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
      },
      { saved: child("4"), placed: timePlacement(0) },
    );
    const rounds: Record<string, unknown>[] = [];
    let out = 0;
    for (let round = 0; round < ROUNDS; round += 1) {
      try {
        await page.goto("./");
        const hint = page.getByRole("status").getByRole("button", { name: "OK" });
        if (await hint.count()) await hint.click();
        await page.getByRole("button", { name: "Mia" }).click();
        await page.getByRole("button", { name: which.door }).click();
        if (first) {
          await page.evaluate(async (url) => {
            const art = new Image();
            art.src = url;
            await art.decode();
          }, new URL(`backdrops/${which.painting}.webp`, baseURL).href);
        }
        await page.locator(`[data-activity=${which.activity}]`).click();
        const art = game(page, which.activity).locator("img.game-backdrop-art");
        await art.waitFor({ state: "attached", timeout: 15_000 });
        const cameIn = await art.evaluate((img) => new Promise<boolean>((done) => {
          const until = performance.now() + 4000;
          const look = () => (img.getAttribute("data-in") === "true" ? done(true) : performance.now() > until ? done(false) : setTimeout(look, 50));
          look();
        }));
        const seen = await page.evaluate(() => {
          const w = window as unknown as { __imgs: { el: HTMLImageElement; rec: Record<string, number | boolean | string | undefined> }[]; __t0: number; __loading: [string, number][] };
          const from = (t: unknown) => (typeof t === "number" ? Math.round(t - w.__t0) : undefined);
          return {
            loading: w.__loading.filter(([, t]) => t >= w.__t0).map(([what, t]) => `${what}${from(t)}`).join(" "),
            imgs: w.__imgs.filter((x) => x.rec.set as number >= w.__t0).map(({ el, rec }) => ({ src: rec.src, set: from(rec.set), c0: rec.complete0, put: from(rec.put), loads: ((rec.loads ?? []) as unknown as [number, boolean][]).map(([t, on]) => `${from(t)}${on ? "on" : "off"}`).join(" "), error: from(rec.error), now: el.isConnected, in: el.getAttribute("data-in"), complete: el.complete })),
          };
        });
        if (!cameIn) out += 1;
        rounds.push({ round, in: cameIn, ...seen });
      } catch (error) {
        rounds.push({ round, failed: String(error).split("\n")[0].slice(0, 160) });
      }
    }
    mkdirSync("lab-out", { recursive: true });
    const shown = (r: Record<string, unknown>) => ((r.imgs as { now: boolean; loads: string }[] | undefined) ?? []).find((img) => img.now);
    const tally = {
      shownLoadedOff: rounds.filter((r) => /off/.test(shown(r)?.loads ?? "")).length,
      shownLoadedOn: rounds.filter((r) => /on/.test(shown(r)?.loads ?? "")).length,
      shownOnlyOff: rounds.filter((r) => /off/.test(shown(r)?.loads ?? "") && !/on/.test(shown(r)?.loads ?? "")).length,
    };
    const stayedOut = rounds.filter((r) => r.in === false);
    const cameIn = rounds.filter((r) => r.in === true);
    writeFileSync(
      `lab-out/${testInfo.project.name}--${name}${first ? "-first" : ""}r${testInfo.repeatEachIndex}.json`,
      JSON.stringify({ rounds: rounds.length, out, ...tally, failed: rounds.filter((r) => r.failed).length, stayedOut: stayedOut.slice(0, 6), cameIn: cameIn.slice(0, 3), errors: rounds.filter((r) => r.failed).slice(0, 2) }),
    );
  });
}

// The engine alone, no React: a picture made off the page (as React makes it, inside a parent not
// yet on the page), its address set, and put on the page 300ms later. Does its load come before?
test("LAB the engine: a picture's load, made off the page", async ({ page, baseURL }, testInfo) => {
  await page.goto("./");
  const seen = await page.evaluate(async (base) => {
    const warm = new Image();
    warm.src = `${base}backdrops/room.webp`;
    await warm.decode();
    // `again`: once on the page, its address is set again, to the same one (as React does when it
    // puts a picture on the page, so that a load it missed comes again).
    const probe = (name: string, src: string, inParent: boolean, decodingFirst: boolean, again = false) =>
      new Promise<Record<string, unknown>>((done) => {
        const img = document.createElement("img");
        const box = document.createElement("div");
        if (inParent) box.appendChild(img);
        const t0 = performance.now();
        const loads: string[] = [];
        img.addEventListener("load", () => { loads.push(`${Math.round(performance.now() - t0)}${img.isConnected ? "on" : "off"}`); });
        if (decodingFirst) img.setAttribute("decoding", "async");
        img.setAttribute("src", src);
        if (!decodingFirst) img.setAttribute("decoding", "async");
        const complete0 = img.complete;
        setTimeout(() => {
          const before = { complete: img.complete, loads: loads.join(" ") };
          document.body.appendChild(inParent ? box : img);
          let completeAgain: boolean | null = null;
          if (again) { img.src = src; completeAgain = img.complete; }
          setTimeout(() => { done({ name, complete0, before, completeAgain, loads: loads.join(" ") }); (inParent ? box : img).remove(); }, 250);
        }, 300);
      });
    const out = [];
    for (const [name, src] of [["fetched before", `${base}backdrops/room.webp`], ["not fetched before", `${base}backdrops/garden.webp?${Math.random()}`]] as const)
      for (const inParent of [true, false]) out.push(await probe(`${name}, ${inParent ? "in a parent" : "alone"}`, src, inParent, false));
    for (const [name, src] of [["fetched before", `${base}backdrops/room.webp`], ["not fetched before", `${base}backdrops/pond.webp?${Math.random()}`]] as const)
      out.push(await probe(`${name}, in a parent, its address set again on the page`, src, true, false, true));
    return out;
  }, new URL(baseURL ?? "").pathname);
  mkdirSync("lab-out", { recursive: true });
  writeFileSync(`lab-out/${testInfo.project.name}--engine.json`, JSON.stringify(seen));
});
