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

/** Shared app modules may use storage. Section files and the components they draw may not. */
function inSharedModule(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  return ["/src/audio/", "/src/settings.ts", "/src/data/", "/src/hooks/", "/src/offline/", "/src/storage.ts"].some(
    (part) => normalized.includes(part),
  );
}

function resolveRelative(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/**
 * Scan the files `lazy.tsx` loads, then every relative import they reach.
 * `import type` lines are ignored. The Explore folder itself is not the list.
 */
export function exploreImportViolations(file = join(process.cwd(), "src/explore/lazy.tsx")): string[] {
  if (!existsSync(file)) return [];
  const violations: string[] = [];
  const seen = new Set<string>();
  const walk = (path: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    for (const specifier of valueSpecifiers(readFileSync(path, "utf8"))) {
      if (forbiddenSpecifier(specifier)) violations.push(`${path}: ${specifier}`);
      const next = resolveRelative(path, specifier);
      if (next && !inSharedModule(next)) walk(next);
    }
  };
  for (const specifier of valueSpecifiers(readFileSync(file, "utf8"))) {
    const target = resolveRelative(file, specifier);
    if (target) walk(target);
  }
  return violations;
}
