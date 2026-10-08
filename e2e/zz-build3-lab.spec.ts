import { test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * The measuring bench (branch lab/**, never merged): two faults from the build 3 playtest, looked
 * at in WebKit (the engine of the iPhone and iPad app) and Chromium.
 *
 *  - Hatch the Egg: A tapped for _NT buzzed as wrong, and the blank never filled.
 *  - Take me home: the animal was not on the board at its start.
 *
 * What is written: for Hatch, where the A tile is (as the page and as Playwright see it), what is
 * under its middle, and what a tap there did; for Take me home, the animal's boxes from the outside
 * in, its picture, and a small picture of the board (JPEG, base64) to look at.
 */
function created(): string {
  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString();
}

async function child(page: Page, age: string, hatch: number) {
  await page.addInitScript(
    ({ created, age, hatch }) => {
      if (sessionStorage.getItem("lab-seeded")) return;
      sessionStorage.setItem("lab-seeded", "1");
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange: age, animal: "fox", createdAt: created, stars: 0, days: {}, ladder: { step: 1, successes: 0 }, games: { hatch, hatches: 0, spins: 0 } }] }));
      localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
    },
    { created: created(), age, hatch },
  );
  await page.goto("./");
  await page.locator("button.who-pick").first().click();
}

function write(project: string, name: string, data: unknown) {
  mkdirSync("lab-out", { recursive: true });
  writeFileSync(`lab-out/${project}--${name}.json`, JSON.stringify(data));
}

test("LAB Hatch the Egg: A for _NT", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await child(page, "4", 1);
  await page.locator("[data-dock=games]").click();
  const words: string[] = [];
  for (let tries = 0; tries < 30; tries += 1) {
    await page.locator("[data-game-tile=hatch]").click();
    const frame = page.locator(".game-frame[data-screen=hatch]");
    await frame.waitFor();
    const word = (await frame.getAttribute("data-word")) ?? "";
    words.push(word);
    if (word !== "ant") {
      await page.locator(".games-back").click();
      continue;
    }
    await page.waitForTimeout(800);
    const tile = frame.locator("[data-letter=a]");
    const pw = await tile.boundingBox();
    const seen = await page.evaluate(() => {
      const frame = document.querySelector(".game-frame[data-screen=hatch]")!;
      const tiles = [...frame.querySelectorAll("[data-letter]")].map((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        const under = document.elementFromPoint(cx, cy);
        return { letter: el.getAttribute("data-letter"), rect: [r.x, r.y, r.width, r.height].map(Math.round), under: under?.closest("[data-letter]")?.getAttribute("data-letter") ?? `${under?.tagName}.${under?.className}` };
      });
      return { zoom: getComputedStyle(frame).zoom, blanks: [...frame.querySelectorAll(".hatch-blanks span")].map((s) => `${s.getAttribute("data-blank")}:${s.textContent}`).join(" "), tiles };
    });
    // A tap where Playwright says the tile is, as a finger would.
    await page.mouse.click(pw!.x + pw!.width / 2, pw!.y + pw!.height / 2);
    await page.waitForTimeout(700);
    const after = await frame.evaluate((el) => ({
      blanks: [...el.querySelectorAll(".hatch-blanks span")].map((s) => `${s.getAttribute("data-blank")}:${s.textContent}`).join(" "),
      solved: el.getAttribute("data-solved"),
      misses: el.getAttribute("data-misses"),
      wiggling: [...el.querySelectorAll("[data-letter]")].filter((t) => t.getAttribute("data-wiggle") !== "false").map((t) => t.getAttribute("data-letter")),
    }));
    write(testInfo.project.name, "hatch", { tries, words, playwrightBox: pw && [pw.x, pw.y, pw.width, pw.height].map(Math.round), ...seen, after });
    return;
  }
  write(testInfo.project.name, "hatch", { words, found: false });
});

for (const age of ["4", "6-7"]) {
  test(`LAB Take me home: the animal at its start, age ${age}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await child(page, age, 1);
    await page.locator("[data-course=code]").click();
    await page.locator("[data-game-tile=bird]").click();
    const frame = page.locator(".game-frame[data-screen=bird]");
    await frame.waitFor();
    await page.waitForTimeout(1200);
    const seen = await page.evaluate(() => {
      const frame = document.querySelector(".game-frame[data-screen=bird]")!;
      const field = frame.querySelector(".code-field")!.getBoundingClientRect();
      const rel = (el: Element | null) => {
        if (!el) return "none";
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return `${Math.round(r.x - field.x)},${Math.round(r.y - field.y)} ${Math.round(r.width)}x${Math.round(r.height)} ${cs.display} ${cs.visibility} op${cs.opacity} h=${cs.height} w=${cs.width}`;
      };
      const pet = frame.querySelector(".code-pet");
      const img = pet?.querySelector("img") as HTMLImageElement | null | undefined;
      return {
        zoom: getComputedStyle(frame).zoom,
        mode: frame.getAttribute("data-mode"),
        at: `${frame.getAttribute("data-x")},${frame.getAttribute("data-y")}`,
        stage: rel(frame.querySelector(".code-stage")),
        field: `${Math.round(field.width)}x${Math.round(field.height)} style=${(frame.querySelector(".code-field") as HTMLElement).getAttribute("style")}`,
        startCell: rel(frame.querySelector(".code-cell[data-animal=true]")),
        pet: rel(pet ?? null),
        petTransform: pet ? getComputedStyle(pet).transform : "none",
        body: rel(pet?.querySelector(".game-host-body") ?? null),
        move: rel(pet?.querySelector(".code-pet-move") ?? null),
        hero: rel(pet?.querySelector(".hero") ?? null),
        img: img ? `${img.getAttribute("src")} complete=${img.complete} natural=${img.naturalWidth}x${img.naturalHeight} ${rel(img)}` : "no img",
        imgs: pet ? [...pet.querySelectorAll("img")].map((i) => `${(i.getAttribute("src") ?? "").split("/").pop()}:${getComputedStyle(i).opacity}/${getComputedStyle(i).visibility}`).join(" ") : "",
      };
    });
    // A small picture of the board, in WebKit only (the notices that carry it are few).
    const shot = testInfo.project.name.startsWith("wk-") ? await page.locator(".game-frame[data-screen=bird] .code-stage").screenshot({ type: "jpeg", quality: 25, scale: "css" }).catch(() => null) : null;
    write(testInfo.project.name, `bird${age.replace("-", "")}`, { age, ...seen, jpeg: shot ? shot.toString("base64") : null });
  });
}
