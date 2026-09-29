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

  it("is what the App Pilot scheme archives with", () => {
    expect(scheme).toMatch(/<ArchiveAction[\s\S]*buildConfiguration = "Pilot"/);
  });
});
