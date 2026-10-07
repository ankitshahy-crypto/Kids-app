#!/usr/bin/env node
/**
 * Runs `npm audit` and says what it found where the pull request shows it.
 *
 * Why this exists: `npm audit` prints a table to the job's log and exits with
 * a number. On the pull request that is a red mark and "exit code 1", with
 * the packages and what is wrong with them a click, a log-in and a scroll
 * away. This prints each advisory as one line of a warning on the run
 * instead: the package, how serious, what it is, and whether an update
 * fixes it.
 *
 * It fails (exit 1) when there is an advisory at or above the level given,
 * so a job can still be made to block on it.
 *
 *   node scripts/audit-report.mjs [--level=high] [any npm audit flag, e.g. --omit=dev]
 *
 * AUDIT_JSON=path reads a saved `npm audit --json` report instead of running
 * npm (for trying this script without the registry).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const flags = process.argv.slice(2);
const level = flags.find((flag) => flag.startsWith("--level="))?.slice(8) ?? "high";
const passed = flags.filter((flag) => !flag.startsWith("--level="));
const what = passed.includes("--omit=dev") ? "what the app ships with" : "every package, the build's tools too";

function escapeText(text) {
  return text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function say(kind, title, text) {
  if (process.env.GITHUB_ACTIONS === "true") console.log(`::${kind} title=${escapeText(title).replace(/:/g, "%3A").replace(/,/g, "%2C")}::${escapeText(text)}`);
  else console.log(`${title}\n${text}\n`);
}

function read() {
  if (process.env.AUDIT_JSON) return readFileSync(process.env.AUDIT_JSON, "utf8");
  // npm exits non-zero when it finds anything: the report is on stdout either way.
  const run = spawnSync("npm", ["audit", "--json", ...passed], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (!run.stdout) throw new Error(run.stderr || `npm audit gave no report (exit ${run.status})`);
  return run.stdout;
}

/** One advisory's own words, from a package's `via` list. A name alone means "through that package". */
function reasons(entry) {
  const own = (entry.via ?? []).filter((via) => typeof via === "object" && via !== null);
  if (own.length > 0) return [...new Set(own.map((via) => `${via.title}${via.url ? ` (${via.url})` : ""}`))].join("; ");
  const through = (entry.via ?? []).filter((via) => typeof via === "string");
  return through.length > 0 ? `through ${[...new Set(through)].join(", ")}` : "no description given";
}

function fix(entry) {
  const available = entry.fixAvailable;
  if (available === true) return "An update within the allowed versions fixes it (npm audit fix)";
  if (available && typeof available === "object") return `Fixed by ${available.name}@${available.version}${available.isSemVerMajor ? ", a major version up" : ""}`;
  return "No fixed version yet";
}

let report;
try {
  report = JSON.parse(read());
} catch (error) {
  // No report is not a clean bill: say so, and fail.
  say("error", "npm audit could not be read", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
if (report.error || (report.message && !report.vulnerabilities)) {
  // npm's own failure (the registry would not answer, say), also as JSON.
  const said = [report.message, report.error?.summary, report.error?.detail, report.error?.code].filter(Boolean).join(" ");
  say("error", "npm audit could not ask the registry", said || JSON.stringify(report).slice(0, 400));
  process.exit(1);
}

const found = Object.values(report.vulnerabilities ?? {}).sort((a, b) => (RANK[b.severity] ?? 0) - (RANK[a.severity] ?? 0) || a.name.localeCompare(b.name));
if (found.length === 0) {
  say("notice", `npm audit: nothing known against ${what}`, "No advisory is listed against any of these packages today.");
  process.exit(0);
}
const lines = found.map((entry) => `${entry.severity}  ${entry.name}${entry.isDirect ? " (named in package.json)" : ""}  ${entry.range}: ${reasons(entry)}. ${fix(entry)}.`);
const over = found.filter((entry) => (RANK[entry.severity] ?? 0) >= (RANK[level] ?? 3));
say(over.length > 0 ? "warning" : "notice", `npm audit: ${found.length} ${found.length === 1 ? "package has" : "packages have"} an advisory (${what})`, lines.join("\n"));
process.exit(over.length > 0 ? 1 : 0);
