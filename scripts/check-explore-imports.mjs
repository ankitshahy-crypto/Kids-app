import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/explore", import.meta.url));

/** Explore sections must not import profiles, the stars store, or progress storage. */
export function forbiddenSpecifier(specifier) {
  const path = specifier.replace(/\\/g, "/");
  return /(?:^|\/)(?:data\/profiles|data\/rewards|storage)(?:\.ts)?$/.test(path);
}

function walk(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...walk(path));
    else if (path.endsWith(".ts") || path.endsWith(".tsx")) found.push(path);
  }
  return found;
}

export function exploreImportViolations(dir = root) {
  if (!existsSync(dir)) return [];
  const violations = [];
  for (const file of walk(dir)) {
    const text = readFileSync(file, "utf8");
    const pattern = /from\s+["']([^"']+)["']/g;
    let match = pattern.exec(text);
    while (match) {
      if (forbiddenSpecifier(match[1])) violations.push(`${file}: ${match[1]}`);
      match = pattern.exec(text);
    }
  }
  return violations;
}

const violations = exploreImportViolations();
if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(existsSync(root) ? "Explore import guard passed." : "No Explore sections yet. Import guard passed.");
