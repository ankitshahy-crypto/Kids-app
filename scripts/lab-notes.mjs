#!/usr/bin/env node
// Prints what the measuring bench wrote (lab-out/*.json), and why each failed test failed, as
// notices on the run, where they can be read without the job's log.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const escape = (text) => text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const say = (title, text) => console.log(`::notice title=${escape(title).replace(/:/g, "%3A").replace(/,/g, "%2C")}::${escape(text)}`);
const LIMIT = 30000;

if (existsSync("lab-out")) {
  const byProject = {};
  for (const file of readdirSync("lab-out").sort()) {
    const [project, name] = file.replace(/\.json$/, "").split("--");
    (byProject[project] ||= {})[name] = JSON.parse(readFileSync(`lab-out/${file}`, "utf8"));
  }
  for (const [project, data] of Object.entries(byProject)) {
    const text = JSON.stringify(data);
    for (let at = 0, part = 1; at < text.length; at += LIMIT, part += 1) say(`LAB ${project} ${part}`, text.slice(at, at + LIMIT));
  }
}

const REPORT = "test-results/e2e-results.json";
if (existsSync(REPORT)) {
  const lines = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status !== "unexpected" && test.status !== "flaky") continue;
        const last = (test.results ?? []).at(-1);
        const why = (last?.error?.message ?? last?.errors?.[0]?.message ?? "").replace(/\u001b\[[0-9;]*m/g, "").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 6).join(" | ").slice(0, 420);
        lines.push(`[${test.projectName}] ${spec.file}:${spec.line} ${spec.title} :: ${last?.status} :: ${why}`);
      }
    }
    for (const inner of suite.suites ?? []) walk(inner);
  };
  const report = JSON.parse(readFileSync(REPORT, "utf8"));
  for (const suite of report.suites ?? []) walk(suite);
  const stats = report.stats ?? {};
  const text = `passed ${stats.expected} failed ${stats.unexpected} flaky ${stats.flaky} skipped ${stats.skipped}\n${lines.join("\n")}`;
  for (let at = 0, part = 1; at < text.length; at += LIMIT, part += 1) say(`WHY ${part}`, text.slice(at, at + LIMIT));
}
