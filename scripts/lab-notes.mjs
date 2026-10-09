#!/usr/bin/env node
// Prints what the measuring bench wrote (lab-out/*.json), and why each failed test failed, as
// notices on the run, where they can be read without the job's log.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const escape = (text) => text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const say = (title, text) => all.push(`::notice title=${escape(title).replace(/:/g, "%3A").replace(/,/g, "%2C")}::${escape(text)}`);
// A notice holds 4096 characters, and a step shows ten notices: ask for a slice of ten with --slice=N.
const LIMIT = 3900;
const SLICE = Number((process.argv.find((a) => a.startsWith("--slice=")) ?? "--slice=0").slice(8));
const all = [];

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
        lines.push(`${spec.file}:${spec.line} ${spec.title.slice(0, 70)} :: ${last?.status} ${Math.round((last?.duration ?? 0) / 1000)}s :: ${why.slice(0, 260)}`);
      }
    }
    for (const inner of suite.suites ?? []) walk(inner);
  };
  const report = JSON.parse(readFileSync(REPORT, "utf8"));
  for (const suite of report.suites ?? []) walk(suite);
  const stats = report.stats ?? {};
  // How long the passing tests took: the slowest few, and the middle one.
  const times = [];
  const timeWalk = (suite) => { for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) { const last = (test.results ?? []).at(-1); if (test.status === "expected" && last) times.push([Math.round(last.duration / 100) / 10, `${spec.file}:${spec.line}`]); } for (const inner of suite.suites ?? []) timeWalk(inner); };
  for (const suite of report.suites ?? []) timeWalk(suite);
  times.sort((a, b) => b[0] - a[0]);
  lines.unshift(`passing tests: ${times.length}, median ${times[Math.floor(times.length / 2)]?.[0]}s, slowest ${times.slice(0, 6).map((t) => `${t[0]}s ${t[1]}`).join("; ")}`);
  lines.push(`ALL ${times.map((t) => `${t[1].replace(".spec.ts", "")}=${t[0]}`).join(" ")}`);
  const text = `passed ${stats.expected} failed ${stats.unexpected} flaky ${stats.flaky} skipped ${stats.skipped}\n${lines.join("\n")}`;
  for (let at = 0, part = 1; at < text.length; at += LIMIT, part += 1) say(`WHY ${part}`, text.slice(at, at + LIMIT));
}

for (const line of all.slice(SLICE * 10, SLICE * 10 + 10)) console.log(line);
console.log(`${all.length} notices in all; this step printed slice ${SLICE}`);
