#!/usr/bin/env node
/**
 * Says which browser tests took longest, where the pull request shows it.
 *
 * Why this exists: a test that runs out of time reports only "Test timeout of
 * 30000ms exceeded". How close the passing tests came is in the run's log, one
 * line among hundreds, where nobody looks while the build is green. So a test
 * can creep up to its limit unseen, then fail on a slow runner in a pull
 * request that never touched it. The letter-tracing tests did exactly that.
 *
 * Run after `playwright test`. It reads the JSON report Playwright already
 * writes, prints the slowest tests as a notice, and warns about any test that
 * passed with less than a third of its time to spare. It never fails the
 * build: with no report, or one it cannot read, it says so and stops.
 *
 *   node scripts/slowest-tests.mjs [path/to/e2e-results.json]
 */
import { existsSync, readFileSync } from "node:fs";

const REPORT = process.argv[2] ?? "test-results/e2e-results.json";

/** How many tests the notice lists. */
const SHOWN = 8;

/** A test that passes on more than this share of its limit is one slow runner away from failing. */
const CLOSE = 2 / 3;

/** Every test that ran, from the report's nested suites: describe blocks sit inside files. */
function testsIn(suite, found = []) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const runs = (test.results ?? []).filter((run) => run.status !== "skipped");
      if (runs.length === 0) continue;
      // With retries a test has several runs. The slowest one is the one that nears the limit.
      const slowest = runs.reduce((a, b) => (b.duration > a.duration ? b : a));
      found.push({
        where: `${spec.file}:${spec.line}`,
        title: spec.title,
        ms: slowest.duration,
        limit: test.timeout,
        status: slowest.status,
      });
    }
  }
  for (const inner of suite.suites ?? []) testsIn(inner, found);
  return found;
}

function seconds(ms) {
  return `${(ms / 1000).toFixed(1)} s`;
}

/** "23.5 s of 30 s": how long a test took, against the limit it ran under. A limit of 0 is no limit. */
function spent(test) {
  return test.limit > 0 ? `${seconds(test.ms)} of ${Math.round(test.limit / 1000)} s` : seconds(test.ms);
}

/** GitHub reads `::notice title=…::text` lines from a step's output. These are its escapes. */
function escapeText(text) {
  return text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeTitle(text) {
  return escapeText(text).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

function say(level, title, text) {
  if (process.env.GITHUB_ACTIONS === "true") console.log(`::${level} title=${escapeTitle(title)}::${escapeText(text)}`);
  else console.log(`${title}\n${text}\n`);
}

function report() {
  if (!existsSync(REPORT)) {
    console.log(`No browser test report at ${REPORT}; nothing to time.`);
    return;
  }
  const tests = JSON.parse(readFileSync(REPORT, "utf8")).suites.flatMap((suite) => testsIn(suite));
  if (tests.length === 0) {
    console.log("The browser test report holds no tests that ran.");
    return;
  }
  tests.sort((a, b) => b.ms - a.ms);

  const lines = tests.slice(0, SHOWN).map((test) => {
    const ending = test.status === "passed" ? "" : ` (${test.status === "timedOut" ? "timed out" : test.status})`;
    return `${spent(test)}  ${test.where}  ${test.title}${ending}`;
  });
  say("notice", `Slowest of ${tests.length} browser tests`, lines.join("\n"));

  // With no limit (0) there is nothing to be close to.
  const close = tests.filter((test) => test.status === "passed" && test.limit > 0 && test.ms > test.limit * CLOSE);
  if (close.length > 0) {
    say(
      "warning",
      "Browser tests close to their time limit",
      `${close.length === 1 ? "This test passed" : "These tests passed"} with less than a third of the time to spare, so a slower runner can fail ${close.length === 1 ? "it" : "them"}. Make ${close.length === 1 ? "it" : "them"} quicker before that happens.\n` +
        close.map((test) => `${spent(test)}  ${test.where}  ${test.title}`).join("\n"),
    );
  }
}

try {
  report();
} catch (error) {
  // A timing note must never turn a passing build red.
  console.log(`Could not read the browser test timings: ${error instanceof Error ? error.message : String(error)}`);
}
