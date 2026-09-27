import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classQrLink, nativeJoinUrl, prefersIosApp, shouldOpenNative, IOS_BUNDLE_ID } from "./nativeOpen";

describe("class QR opens the iOS app first", () => {
  it("keeps an https link and a native scheme", () => {
    const link = classQrLink("https://ankitshahy-crypto.github.io/Kids-app/", "BUNNY-42");
    const url = new URL(link);
    expect(url.protocol).toBe("https:");
    expect(url.searchParams.get("classCode")).toBe("BUNNY-42");
    expect(url.searchParams.get("open")).toBe("app");
    expect(nativeJoinUrl("class", "BUNNY-42")).toBe("littlenest://join?classCode=BUNNY-42");
    expect(prefersIosApp("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    expect(prefersIosApp("Mozilla/5.0 (Linux; Android 14)")).toBe(false);
    expect(shouldOpenNative("iPhone", "?classCode=BUNNY-42&open=app")).toBe(true);
    expect(shouldOpenNative("Android", "?classCode=BUNNY-42&open=app")).toBe(false);
  });

  it("publishes the site association and the 5 and under age band", () => {
    const association = readFileSync("public/.well-known/apple-app-site-association", "utf8");
    expect(association).toContain(IOS_BUNDLE_ID);
    expect(association).toContain("/Kids-app/*");
    const listing = readFileSync("docs/store-listing.md", "utf8");
    expect(listing).toContain("5 and under");
    expect(listing).toContain("LittleNest Learning: Ages 3-7");
    expect(listing).toContain("Read, math, science & coding");
  });
});
