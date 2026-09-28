import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The pilot unlock is an explicit build flag, never a guess from the StoreKit
 * environment: App Review runs in the sandbox too, and reviewers must see the
 * paywall. Only the Pilot configuration (the "App Pilot" scheme) turns it on.
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

  it("never comes from the StoreKit environment or the receipt", () => {
    expect(plugin).not.toMatch(/\.sandbox|sandboxReceipt|appStoreReceiptURL|AppTransaction/);
  });

  it("is what the App Pilot scheme archives with", () => {
    expect(scheme).toMatch(/<ArchiveAction[\s\S]*buildConfiguration = "Pilot"/);
  });
});
