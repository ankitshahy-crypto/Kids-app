#!/usr/bin/env node
// Prints why the unit tests failed, as notices on the run, where they can be read without the log:
// each failed test from vitest's JSON report, and the log's lines about errors.
import { existsSync, readFileSync } from "node:fs";

const escape = (text) => text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const notes = [];
const say = (title, text) => notes.push(`::notice title=${escape(title).replace(/:/g, "%3A").replace(/,/g, "%2C")}::${escape(text.slice(0, 3900))}`);
const plain = (text) => text.replace(/\u001b\[[0-9;]*m/g, "");

if (existsSync("unit.json")) {
  const report = JSON.parse(readFileSync("unit.json", "utf8"));
  say("UNIT totals", `files ${report.numTotalTestSuites} tests ${report.numTotalTests} failed ${report.numFailedTests} passed ${report.numPassedTests} success ${report.success}`);
  for (const file of report.testResults ?? []) {
    if (file.status !== "passed" && file.message) say(`UNIT file ${file.name.split("/src/")[1] ?? file.name}`, plain(file.message));
    for (const test of file.assertionResults ?? []) {
      if (test.status !== "failed") continue;
      say(`UNIT ${(file.name.split("/src/")[1] ?? file.name)} :: ${test.fullName}`.slice(0, 200), plain((test.failureMessages ?? []).join("\n")).split("\n").slice(0, 30).join("\n"));
    }
  }
} else say("UNIT", "no unit.json");
if (existsSync("unit.log")) {
  const lines = plain(readFileSync("unit.log", "utf8")).split("\n");
  const marks = lines.map((line, index) => (/FAIL|Error|Unhandled|unhandled|×|✗|timed out/.test(line) ? index : -1)).filter((index) => index >= 0);
  const picked = new Set();
  for (const index of marks) for (let at = Math.max(0, index - 2); at < Math.min(lines.length, index + 8); at += 1) picked.add(at);
  const text = [...picked].sort((a, b) => a - b).map((at) => lines[at]).join("\n");
  for (let at = 0, part = 1; at < text.length && part <= 6; at += 3800, part += 1) say(`LOG ${part}`, text.slice(at, at + 3800));
  say("LOG tail", lines.slice(-30).join("\n"));
}
for (const line of notes.slice(0, 10)) console.log(line);
console.log(`${notes.length} notices; printed the first 10`);
