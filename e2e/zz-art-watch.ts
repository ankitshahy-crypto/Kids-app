import type { Page, TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * The measuring bench (branch lab/**, never merged): what happened to each painting in a test, for
 * a test that fails waiting for one. In the page, every picture of a painting: its address set (as
 * an attribute, and as a property, which is how React sets it again when it puts the picture on
 * the page), its loads and errors, data-in, when it was put on the page and taken off; with, each
 * time, whether it is complete, its width and whether it is on the page. From the test, every
 * request for a painting and what became of it. All on one clock (Date.now).
 */
export function watchPaintings(page: Page) {
  const net: string[] = [];
  const started = Date.now();
  const at = () => Date.now() - started;
  const short = (url: string) => url.replace(/^.*\/backdrops\//, "");
  page.on("request", (request) => { if (request.url().includes("/backdrops/")) net.push(`${at()} ask ${short(request.url())}`); });
  page.on("response", (response) => { if (response.url().includes("/backdrops/")) net.push(`${at()} answer ${response.status()} ${short(response.url())} ${response.headers()["cache-control"] ?? ""}`); });
  page.on("requestfinished", (request) => { if (request.url().includes("/backdrops/")) net.push(`${at()} done ${short(request.url())} took ${Math.round(request.timing().responseEnd)}`); });
  page.on("requestfailed", (request) => { if (request.url().includes("/backdrops/")) net.push(`${at()} failed ${short(request.url())} ${request.failure()?.errorText ?? ""}`); });
  const ready = page.addInitScript((started) => {
    type Seen = { id: number; ev: string[] };
    const w = window as unknown as { __art: { img: HTMLImageElement; seen: Seen }[] };
    w.__art = [];
    const of = (img: HTMLImageElement) => {
      const marked = img as unknown as { __art?: Seen };
      if (!marked.__art) {
        marked.__art = { id: w.__art.length, ev: [] };
        w.__art.push({ img, seen: marked.__art });
        img.addEventListener("load", () => note(img, "load"));
        img.addEventListener("error", () => note(img, "error"));
      }
      return marked.__art;
    };
    const note = (img: HTMLImageElement, what: string) => of(img).ev.push(`${Date.now() - started} ${what} c${img.complete ? 1 : 0} w${img.naturalWidth} ${img.isConnected ? "on" : "off"}`);
    const watched = (img: Element): img is HTMLImageElement => img instanceof HTMLImageElement && /backdrops\//.test(img.getAttribute("src") ?? "");
    const set = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
      set.call(this, name, value);
      if (watched(this) && (name === "src" || name === "data-in" || name === "decoding")) note(this, name === "src" ? `attr ${String(value).split("/").pop()}` : `${name}=${value}`);
    } as typeof Element.prototype.setAttribute;
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src")!;
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      enumerable: src.enumerable,
      get(this: HTMLImageElement) { return src.get!.call(this); },
      set(this: HTMLImageElement, value: string) { src.set!.call(this, value); if (watched(this)) note(this, "prop src"); },
    });
    new MutationObserver((list) => {
      for (const change of list) {
        for (const node of change.addedNodes) if (node instanceof Element) for (const img of [node, ...node.querySelectorAll("img")]) if (watched(img)) note(img, "put");
        for (const node of change.removedNodes) if (node instanceof Element) for (const img of [node, ...node.querySelectorAll("img")]) if (watched(img)) note(img, "taken off");
      }
    }).observe(document, { childList: true, subtree: true });
  }, started);
  return {
    ready,
    /** On a failed test: what happened, written to lab-out. */
    async report(testInfo: TestInfo) {
      if (testInfo.status === testInfo.expectedStatus) return;
      const art = await page
        .evaluate(() => (window as unknown as { __art?: { img: HTMLImageElement; seen: { id: number; ev: string[] } }[] }).__art?.map(({ img, seen }) => ({ id: seen.id, src: (img.getAttribute("src") ?? "").split("/").pop(), now: `c${img.complete ? 1 : 0} w${img.naturalWidth} ${img.isConnected ? "on" : "off"} in=${img.getAttribute("data-in")}`, ev: seen.ev })) ?? [])
        .catch((problem) => [{ error: String(problem).slice(0, 200) }]);
      mkdirSync("lab-out", { recursive: true });
      const name = `${testInfo.titlePath.slice(1).join(" ").replace(/\W+/g, "-").slice(0, 60)}-${testInfo.repeatEachIndex}-${testInfo.retry}`;
      writeFileSync(`lab-out/${testInfo.project.name}--${name}.json`, JSON.stringify({ error: (testInfo.error?.message ?? "").replace(/\u001b\[[0-9;]*m/g, "").split("\n").slice(0, 3).join(" | ").slice(0, 300), art, net }));
    },
  };
}
