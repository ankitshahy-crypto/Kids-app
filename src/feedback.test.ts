import { describe, expect, it } from "vitest";
import { buildFeedbackMailto } from "./feedback";

describe("feedback mail link", () => {
  it("is empty until a help address is configured", () => {
    expect(buildFeedbackMailto("", { version: "0.1.0" })).toBe("");
  });

  it("opens the mail app with the version, device and lesson week, and no child data", () => {
    const link = buildFeedbackMailto("help@example.test", { version: "0.1.0", week: 3, platform: "iPhone, Safari", screen: "390×844" });
    expect(link.startsWith("mailto:help@example.test?subject=")).toBe(true);
    const body = decodeURIComponent(link.split("&body=")[1]);
    expect(body).toContain("What happened:");
    expect(body).toContain("LittleNest Learning 0.1.0");
    expect(body).toContain("Device: iPhone, Safari");
    expect(body).toContain("Lesson week: 3");
    expect(body).not.toMatch(/Mia|fox|stars/);
  });
});
