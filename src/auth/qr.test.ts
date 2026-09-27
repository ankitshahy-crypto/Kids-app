import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { qrMatrix } from "./qr";

describe("QR codes are drawn in the app", () => {
  it("builds a square code with finder marks and no network call", () => {
    const matrix = qrMatrix("https://example.com/Kids-app/?parentCode=NEST-18");
    expect(matrix.length).toBe(matrix[0]?.length);
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix[0]?.[0]).toBe(true);
    expect(matrix[3]?.[3]).toBe(true);
    const source = readFileSync(new URL("./qr.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/qrserver|chart\.googleapis|fetch\(|api\.qr/i);
  });
});
