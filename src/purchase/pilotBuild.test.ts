import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { afterPilotAnswer, pilotUnlocks } from "./pilot";

/**
 * The pilot unlock needs two things: the explicit build flag (only the Pilot
 * configuration, the "App Pilot" scheme, sets it) and StoreKit saying the app
 * came from TestFlight. The environment alone never opens anything, since App
 * Review runs in the sandbox too; the flag alone never does either, so a
 * pilot archive that reached the App Store still shows the paywall.
 */
const pbxproj = readFileSync(new URL("../../ios/App/App.xcodeproj/project.pbxproj", import.meta.url), "utf8");
const plist = readFileSync(new URL("../../ios/App/App/Info.plist", import.meta.url), "utf8");
const plugin = readFileSync(new URL("../../ios/App/App/StorePlugin.swift", import.meta.url), "utf8");
const scheme = readFileSync(new URL("../../ios/App/App.xcodeproj/xcshareddata/xcschemes/App Pilot.xcscheme", import.meta.url), "utf8");

function targetConfig(name: string): string {
  const configs = pbxproj.split(/\n\t\t[0-9A-F]{24} \/\* (?:Debug|Release|Pilot) \*\/ = \{\n/);
  const block = configs.find((item) => item.includes("INFOPLIST_FILE = App/Info.plist;") && item.includes(`name = ${name};`));
  if (!block) throw new Error(`No target configuration named ${name}`);
  return block;
}

describe("the pilot build flag", () => {
  it("is on only in the Pilot configuration", () => {
    expect(targetConfig("Pilot")).toContain("LN_PILOT_BUILD = YES;");
    expect(targetConfig("Release")).toContain("LN_PILOT_BUILD = NO;");
    expect(targetConfig("Debug")).toContain("LN_PILOT_BUILD = NO;");
  });

  it("reaches the app through Info.plist", () => {
    expect(plist).toContain("<key>LNPilotBuild</key>");
    expect(plist).toContain("<string>$(LN_PILOT_BUILD)</string>");
    expect(plugin).toContain('forInfoDictionaryKey: "LNPilotBuild"');
  });

  it("asks StoreKit where the app came from only when the flag is on", () => {
    const beta = plugin.slice(plugin.indexOf("@objc func beta("), plugin.indexOf("@objc func redeemCode("));
    const guardAt = beta.indexOf('guard flag == "YES"');
    expect(guardAt).toBeGreaterThan(0);
    expect(beta.indexOf("storeEnvironment()")).toBeGreaterThan(guardAt);
    expect(beta).toContain('call.resolve(["pilot": false');
    expect(plugin).toContain("AppTransaction.shared");
    expect(plugin).toMatch(/case \.production: return "production"/);
  });

  it("opens everything only for the pilot flag in TestFlight or Xcode, never on the App Store", () => {
    // Flag on, but the copy came from the App Store: the paywall shows.
    expect(pilotUnlocks({ pilot: true, environment: "production" })).toBe(false);
    expect(afterPilotAnswer({ pilot: true, environment: "production" })).toEqual({ ready: true });
    // Flag on and StoreKit cannot tell: the paywall shows.
    expect(pilotUnlocks({ pilot: true, environment: "unknown" })).toBe(false);
    expect(pilotUnlocks({ pilot: true })).toBe(false);
    // TestFlight (App Review too) with the flag off: the paywall shows.
    expect(pilotUnlocks({ pilot: false, environment: "sandbox" })).toBe(false);
    expect(pilotUnlocks(null)).toBe(false);
    // An older answer shape opens nothing.
    expect(pilotUnlocks({ beta: true } as never)).toBe(false);
    // The pilot build in TestFlight, or run from Xcode: everything opens.
    expect(afterPilotAnswer({ pilot: true, environment: "sandbox" })).toEqual({ beta: true, unlocked: true, ready: true });
    expect(pilotUnlocks({ pilot: true, environment: "xcode" })).toBe(true);
  });

  it("stands on a saved TestFlight answer when StoreKit cannot say, and on nothing else", () => {
    const now = Date.UTC(2026, 9, 1, 12);
    const day = 24 * 60 * 60 * 1000;
    // Offline in the car, confirmed in TestFlight three days ago: everything opens.
    expect(pilotUnlocks({ pilot: true, environment: "unknown", verifiedAt: now - 3 * day }, now)).toBe(true);
    expect(afterPilotAnswer({ pilot: true, environment: "unknown", verifiedAt: now - 3 * day }, now)).toEqual({ beta: true, unlocked: true, ready: true });
    // A fresh install offline, with nothing saved: the paywall.
    expect(pilotUnlocks({ pilot: true, environment: "unknown" }, now)).toBe(false);
    // Saved too long ago, or with a clock set ahead: the paywall.
    expect(pilotUnlocks({ pilot: true, environment: "unknown", verifiedAt: now - 61 * day }, now)).toBe(false);
    expect(pilotUnlocks({ pilot: true, environment: "unknown", verifiedAt: now + 2 * day }, now)).toBe(false);
    // The App Store always wins, saved answer or not.
    expect(pilotUnlocks({ pilot: true, environment: "production", verifiedAt: now - day }, now)).toBe(false);
    // A build without the flag never uses it.
    expect(pilotUnlocks({ pilot: false, environment: "unknown", verifiedAt: now - day }, now)).toBe(false);
  });

  it("saves the answer natively, only for TestFlight, and deletes it for the App Store or a build without the flag", () => {
    const beta = plugin.slice(plugin.indexOf("@objc func beta("), plugin.indexOf("private static let pilotVerifiedKey"));
    // Kept in UserDefaults on the phone, never in the web view's storage.
    expect(plugin).toContain('private static let pilotVerifiedKey = "LNPilotVerifiedAt"');
    expect(beta).toContain("UserDefaults.standard");
    // Flag off: the saved answer goes, before anything else.
    const flagOff = beta.slice(beta.indexOf('guard flag == "YES"'), beta.indexOf("Task {"));
    expect(flagOff).toContain("removeObject(forKey: Self.pilotVerifiedKey)");
    // Saved only on a TestFlight or Xcode answer; deleted on an App Store one.
    expect(beta).toMatch(/case "sandbox", "xcode":\s*\n\s*defaults\.set\(Date\(\)\.timeIntervalSince1970, forKey: Self\.pilotVerifiedKey\)/);
    expect(beta).toMatch(/case "production":\s*\n\s*defaults\.removeObject\(forKey: Self\.pilotVerifiedKey\)/);
    expect(beta.match(/defaults\.set\(/g)).toHaveLength(1);
    // StoreKit that cannot answer within a few seconds says "unknown".
    expect(plugin).toMatch(/Task\.sleep\(nanoseconds: 4_000_000_000\)\s*\n\s*once\.run \{ continuation\.resume\(returning: "unknown"\) \}/);
  });

  it("fails any build that is not Pilot but carries the flag, and any Release build without NO", () => {
    // Every configuration but Pilot says NO.
    const flags = [...pbxproj.matchAll(/LN_PILOT_BUILD = (\w+);/g)].map((match) => match[1]);
    expect(flags.filter((flag) => flag === "YES")).toHaveLength(1);
    // The target runs a check before it compiles anything.
    expect(pbxproj).toMatch(/buildPhases = \(\n\t+[0-9A-F]{24} \/\* Check pilot flag \*\/,/);
    const phase = pbxproj.slice(pbxproj.indexOf("/* Check pilot flag */ = {"), pbxproj.indexOf("End PBXShellScriptBuildPhase"));
    expect(phase).toContain("isa = PBXShellScriptBuildPhase;");
    expect(phase).toMatch(/LN_PILOT_BUILD\}\\" = \\"YES\\" \] && \[ \\"\$\{CONFIGURATION\}\\" != \\"Pilot\\"/);
    expect(phase).toMatch(/CONFIGURATION\}\\" = \\"Release\\" \] && \[ \\"\$\{LN_PILOT_BUILD\}\\" != \\"NO\\"/);
    expect(phase).toContain("exit 1");
  });

  it("looks different from the App Store build: version 0.9.x and named LittleNest Pilot", () => {
    expect(targetConfig("Pilot")).toContain("MARKETING_VERSION = 0.9.0;");
    expect(targetConfig("Pilot")).toContain('LN_DISPLAY_NAME = "LittleNest Pilot";');
    expect(targetConfig("Release")).toMatch(/MARKETING_VERSION = [1-9]/);
    expect(targetConfig("Release")).toContain("LN_DISPLAY_NAME = LittleNest;");
    expect(targetConfig("Debug")).toContain("LN_DISPLAY_NAME = LittleNest;");
    // The name under the icon comes from that setting.
    expect(plist).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>\$\(LN_DISPLAY_NAME\)<\/string>/);
    // And the build check refuses a Pilot build that is not 0.9.x or not so named, and an App Store build that is.
    const phase = pbxproj.slice(pbxproj.indexOf("/* Check pilot flag */ = {"), pbxproj.indexOf("End PBXShellScriptBuildPhase"));
    expect(phase).toContain("a Pilot build must be version 0.9.x");
    expect(phase).toContain("a Pilot build must be named LittleNest Pilot");
    expect(phase).toContain("an App Store build must be version 1.0 or later");
    expect(phase).toContain("an App Store build must be named LittleNest");
  });

  it("is what the App Pilot scheme archives with", () => {
    expect(scheme).toMatch(/<ArchiveAction[\s\S]*buildConfiguration = "Pilot"/);
  });
});

/**
 * App Store Connect refuses an upload whose app code touches a "required reason" API without a
 * privacy manifest saying why (ITMS-91053), TestFlight included. The app's own Swift uses one:
 * UserDefaults, for the pilot memo. The manifest has to be in the bundle, so it is checked here
 * as a file in the target's Resources phase, not only on disk.
 */
describe("the privacy manifest", () => {
  const manifest = readFileSync(new URL("../../ios/App/App/PrivacyInfo.xcprivacy", import.meta.url), "utf8");
  const swift = ["AppDelegate", "SceneDelegate", "StorePlugin"].map((name) => readFileSync(new URL(`../../ios/App/App/${name}.swift`, import.meta.url), "utf8")).join("\n");
  const resources = pbxproj.slice(pbxproj.indexOf("/* Resources */ = {"), pbxproj.indexOf("End PBXResourcesBuildPhase"));

  it("is in the App target's bundle", () => {
    expect(pbxproj).toMatch(/[0-9A-F]{24} \/\* PrivacyInfo\.xcprivacy \*\/ = \{isa = PBXFileReference;/);
    expect(resources).toMatch(/[0-9A-F]{24} \/\* PrivacyInfo\.xcprivacy in Resources \*\/,/);
  });

  it("tracks nothing and collects nothing", () => {
    expect(manifest).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
    expect(manifest).toMatch(/<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/);
    expect(manifest).toMatch(/<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/);
  });

  it("declares every required-reason API the app's own code uses, with Apple's category names", () => {
    // The five categories and what in Swift would reach them.
    const categories: [string, RegExp][] = [
      ["NSPrivacyAccessedAPICategoryUserDefaults", /UserDefaults/],
      ["NSPrivacyAccessedAPICategoryFileTimestamp", /creationDate|modificationDate|contentModificationDateKey|attributesOfItem|\bstat\(|fstat\(|getattrlist/],
      ["NSPrivacyAccessedAPICategorySystemBootTime", /systemUptime|mach_absolute_time/],
      ["NSPrivacyAccessedAPICategoryDiskSpace", /volumeAvailableCapacity|statfs|volumeTotalCapacity/],
      ["NSPrivacyAccessedAPICategoryActiveKeyboards", /activeInputModes/],
    ];
    for (const [category, use] of categories) {
      const used = use.test(swift);
      expect(manifest.includes(`<string>${category}</string>`), `${category} is ${used ? "used, so must be" : "unused, so is not"} declared`).toBe(used);
    }
    // UserDefaults holds only what the app wrote itself: reason CA92.1.
    expect(manifest).toMatch(/NSPrivacyAccessedAPICategoryUserDefaults<\/string>\s*<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>\s*<string>CA92\.1<\/string>\s*<\/array>/);
    // The misspelling that looks right and is refused.
    expect(manifest).not.toContain("NSPrivacyAccessedAPITypeUserDefaults");
  });
});
