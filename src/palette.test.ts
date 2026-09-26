import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { paintFill } from "./data/colors";

function channel(hex: string, index: number): number {
  const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
}

function contrast(foreground: string, background: string): number {
  const left = luminance(foreground);
  const right = luminance(background);
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

function tokens(): Map<string, string> {
  const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const block = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!block) throw new Error("missing :root");
  const found = new Map<string, string>();
  for (const match of block[1].matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    found.set(match[1], match[2].toLowerCase());
  }
  return found;
}

const surfaces = ["--cream", "--paper", "--adult", "--sand", "--butter", "--mint-wash", "--mint-card"] as const;

describe("pastel text tokens", () => {
  const color = tokens();

  it("keeps body text at AA on every pastel surface", () => {
    for (const name of ["--text", "--text-muted", "--text-sage", "--text-warm"] as const) {
      for (const surface of surfaces) {
        expect(contrast(color.get(name)!, color.get(surface)!), `${name} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps button labels at AA on the action fill", () => {
    expect(contrast(color.get("--text-on-action")!, color.get("--action")!)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the large wordmark at AA on the cream background", () => {
    expect(contrast(color.get("--wordmark-sage")!, color.get("--cream")!)).toBeGreaterThanOrEqual(3);
    expect(contrast(color.get("--wordmark-peach")!, color.get("--cream")!)).toBeGreaterThanOrEqual(3);
  });
});

function saturation(hex: string): number {
  const channels = [0, 1, 2].map((index) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255);
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  const light = (max + min) / 2;
  if (max === min) return 0;
  const delta = max - min;
  return light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
}

describe("color lesson paints", () => {
  const color = tokens();

  it("matches the saturated paint tokens and stays off the pastel gold", () => {
    for (const [name, fill] of Object.entries(paintFill)) {
      expect(color.get(`--paint-${name}`)).toBe(fill);
    }
    expect(paintFill.yellow).not.toBe(color.get("--gold"));
    expect(paintFill.white).toBe("#ffffff");
    for (const name of ["red", "blue", "yellow", "green", "orange", "purple", "pink"] as const) {
      expect(saturation(paintFill[name]), name).toBeGreaterThanOrEqual(0.65);
    }
  });
});
