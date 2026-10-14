import { describe, expect, it } from "vitest";
import { OFFER_CODES_ENABLED, paywallPrivacyUrl, termsOfUseUrl } from "../config";
import panelSource from "../components/UnlockPanel.tsx?raw";

describe("the paywall at launch", () => {
  it("keeps offer codes off for 1.0", () => {
    expect(OFFER_CODES_ENABLED).toBe(false);
  });

  it("gates the Have a code? button and the pilot line about codes on the flag", () => {
    expect(panelSource).toMatch(/OFFER_CODES_ENABLED && !unlock\.unlocked/);
    expect(panelSource).toMatch(/OFFER_CODES_ENABLED \? \(\s*<>\s*\{" "\}\s*If a school or partner gave you a code/);
  });

  it("links the Privacy Policy and Apple's standard Terms of Use", () => {
    expect(paywallPrivacyUrl).toBe("https://littlenestlearning.app/privacy");
    expect(termsOfUseUrl).toBe("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
    expect(panelSource).toContain("href={paywallPrivacyUrl}");
    expect(panelSource).toContain("href={termsOfUseUrl}");
  });

  it("never calls the unlock a subscription, except to say it is not one", () => {
    const mentions = panelSource.match(/subscri\w*/gi) ?? [];
    expect(mentions.length).toBeGreaterThan(0);
    expect(panelSource).toContain("No subscription required.");
    expect(panelSource.replace("No subscription required.", "")).not.toMatch(/subscri/i);
  });
});
