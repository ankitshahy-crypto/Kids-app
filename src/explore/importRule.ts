import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Explore sections must not import profiles, the stars store, or progress storage. */
export const FORBIDDEN_IMPORT = /(?:^|\/)(?:data\/profiles|data\/rewards|storage)(?:\.ts)?$/;

export function forbiddenSpecifier(specifier: string): boolean {
  return FORBIDDEN_IMPORT.test(specifier.replace(/\\/g, "/"));
}

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...walk(path));
    else if (path.endsWith(".ts") || path.endsWith(".tsx")) found.push(path);
  }
  return found;
}

export function exploreImportViolations(dir = join(process.cwd(), "src/explore")): string[] {
  const violations: string[] = [];
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
