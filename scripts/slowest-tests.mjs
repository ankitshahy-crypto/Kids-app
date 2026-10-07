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
 * It also says which tests passed only on a second try. On CI a failed test
 * is tried once more, so that one slow moment on a shared runner does not
 * turn a good commit red; but a test that needs its second try is hiding a
 * race, in the test or in the app, and a retry that nobody hears about
 * would hide it for good. So each one is named in a warning.
 *
 * And it writes the run's outcome to the job's summary page: how many
 * passed, and the name of each test that failed or needed a second try.
 *
 *   node scripts/slowest-tests.mjs [path/to/e2e-results.json]
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";

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
        // The test as a whole: "expected" (passed), "unexpected" (failed), or "flaky" (passed on a later try).
        outcome: test.status,
        project: test.projectName ?? "",
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

/** How many names one list on the summary page holds. A run with more than this failing is broken as a whole. */
const LISTED = 80;

/** A list for the summary page: one line a test, in file order. `timedOut` is what to say of a try that ran out of time. */
function listed(tests, timedOut) {
  const lines = [...tests]
    .sort((a, b) => a.where.localeCompare(b.where, "en", { numeric: true }))
    .slice(0, LISTED)
    .map((test) => `- \`${test.where}\` ${test.title}${test.status === "timedOut" ? ` (${timedOut})` : ""}`);
  if (tests.length > LISTED) lines.push(`- and ${tests.length - LISTED} more`);
  return lines.join("\n");
}

/** The run's outcome, for the job's summary page. Outside GitHub Actions there is no such page. */
function summary(tests, skipped) {
  const page = process.env.GITHUB_STEP_SUMMARY;
  if (!page) return;
  const failed = tests.filter((test) => test.outcome === "unexpected");
  const flaky = tests.filter((test) => test.outcome === "flaky");
  const passed = tests.length - failed.length - flaky.length;
  const projects = [...new Set(tests.map((test) => test.project).filter(Boolean))].join(", ");
  const counts = [`${passed} passed`, `${failed.length} failed`];
  if (flaky.length > 0) counts.push(`${flaky.length} passed only on a second try`);
  if (skipped > 0) counts.push(`${skipped} skipped`);
  const parts = [`### Browser tests${projects ? ` (${projects})` : ""}`, counts.join(" · ")];
  if (failed.length > 0) parts.push(`**Failed**\n\n${listed(failed, "timed out")}`);
  if (flaky.length > 0) parts.push(`**Passed only on a second try**\n\n${listed(flaky, "the first try timed out")}`);
  appendFileSync(page, `${parts.join("\n\n")}\n\n`);
}

function report() {
  if (!existsSync(REPORT)) {
    console.log(`No browser test report at ${REPORT}; nothing to time.`);
    return;
  }
  const read = JSON.parse(readFileSync(REPORT, "utf8"));
  const tests = read.suites.flatMap((suite) => testsIn(suite));
  if (tests.length === 0) {
    console.log("The browser test report holds no tests that ran.");
    return;
  }
  summary(tests, read.stats?.skipped ?? 0);
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

  const flaky = tests.filter((test) => test.outcome === "flaky");
  if (flaky.length > 0) {
    say(
      "warning",
      "Browser tests that passed only on a second try",
      `${flaky.length === 1 ? "This test failed and then passed" : "These tests failed and then passed"} when tried again. That is a race, in the test or in the app: find it before it is a child's screen that loses.\n` +
        flaky.map((test) => `${test.where}  ${test.title}`).join("\n"),
    );
  }
}

try {
  report();
} catch (error) {
  // A timing note must never turn a passing build red.
  console.log(`Could not read the browser test timings: ${error instanceof Error ? error.message : String(error)}`);
}
