import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Explore sections must not import profiles, the stars store, or progress storage. */
export function forbiddenSpecifier(specifier: string): boolean {
  const path = specifier.replace(/\\/g, "/");
  return /(?:^|\/)(?:data\/profiles|data\/rewards|storage)(?:\.ts)?$/.test(path);
}

/** Drop `import type` so a type-only mention of profiles is not a runtime import. */
export function valueSpecifiers(text: string): string[] {
  const code = text.replace(/import\s+type\s+[\s\S]*?from\s+["'][^"']+["'];?/g, "");
  const specs: string[] = [];
  const pattern = /(?:import\s*\(\s*|from\s+)["']([^"']+)["']/g;
  let match = pattern.exec(code);
  while (match) {
    if (match[1]) specs.push(match[1]);
    match = pattern.exec(code);
  }
  return specs;
}

function resolveRelative(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/**
 * Scan the files `lazy.tsx` loads, not the Explore folder. Those are the real
 * section modules. `import type` lines are ignored.
 */
export function exploreImportViolations(file = join(process.cwd(), "src/explore/lazy.tsx")): string[] {
  if (!existsSync(file)) return [];
  const violations: string[] = [];
  const targets = valueSpecifiers(readFileSync(file, "utf8"))
    .map((specifier) => ({ specifier, path: resolveRelative(file, specifier) }))
    .filter((item): item is { specifier: string; path: string } => item.path !== null);
  for (const target of targets) {
    for (const specifier of valueSpecifiers(readFileSync(target.path, "utf8"))) {
      if (forbiddenSpecifier(specifier)) violations.push(`${target.path}: ${specifier}`);
    }
  }
  return violations;
}
