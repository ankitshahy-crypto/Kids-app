import { test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * The measuring bench (branch lab/**, never merged): does a request to the dev server stall after
 * the connection has been idle about as long as the server keeps it (Node's own 5 s)? In the
 * WebKit runs a painting, and once a sound clip, waited seconds with nothing else in flight.
 * The page is loaded once; then, again and again: wait idle for a while, then ask for a picture,
 * as a fetch and as an <img>, and time it. A stall is anything over 2 s.
 */
const IDLE = [1000, 3000, 4600, 4900, 5000, 5100, 5400, 7000];
const ROUNDS = Number(process.env.LAB_ROUNDS ?? 88);

test("LAB requests after an idle connection", async ({ page }, testInfo) => {
  test.setTimeout(1_200_000);
  await page.goto("./");
  await page.waitForTimeout(3000);
  const rows: { idle: number; how: string; ms: number; ok: boolean }[] = [];
  for (let round = 0; round < ROUNDS; round += 1) {
    const idle = IDLE[round % IDLE.length];
    await page.waitForTimeout(idle);
    const how = round % 2 === 0 ? "fetch" : "img";
    const seen = await page.evaluate(async ({ how, n }) => {
      const url = `${location.pathname.replace(/[^/]*$/, "")}backdrops/room.webp?lab=${n}-${Math.random()}`;
      const started = performance.now();
      try {
        if (how === "fetch") {
          const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
          await response.arrayBuffer();
          return { ms: Math.round(performance.now() - started), ok: response.ok };
        }
        const ok = await new Promise<boolean>((done) => {
          const img = new Image();
          const timer = setTimeout(() => done(false), 15000);
          img.onload = () => { clearTimeout(timer); done(true); };
          img.onerror = () => { clearTimeout(timer); done(false); };
          img.src = url;
        });
        return { ms: Math.round(performance.now() - started), ok };
      } catch {
        return { ms: Math.round(performance.now() - started), ok: false };
      }
    }, { how, n: round });
    rows.push({ idle, how, ...seen });
  }
  const byIdle: Record<string, { n: number; stalls: number; failed: number; worst: number }> = {};
  for (const row of rows) {
    const key = `${row.idle}`;
    const b = (byIdle[key] ??= { n: 0, stalls: 0, failed: 0, worst: 0 });
    b.n += 1;
    if (row.ms > 2000) b.stalls += 1;
    if (!row.ok) b.failed += 1;
    b.worst = Math.max(b.worst, row.ms);
  }
  mkdirSync("lab-out", { recursive: true });
  writeFileSync(`lab-out/${testInfo.project.name}--stall-${process.env.LAB_KEEPALIVE ?? "node"}-${testInfo.repeatEachIndex}.json`, JSON.stringify({ byIdle, stalled: rows.filter((r) => r.ms > 2000 || !r.ok).slice(0, 10) }));
});
