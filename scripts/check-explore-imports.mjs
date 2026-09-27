import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { exploreImportViolations } from "../src/explore/importRule.ts";

const lazyPath = join(fileURLToPath(new URL("..", import.meta.url)), "src/explore/lazy.tsx");
const violations = exploreImportViolations(lazyPath);
if (!existsSync(lazyPath)) {
  console.log("No Explore sections yet. Import guard passed.");
} else if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
} else {
  console.log("Explore import guard passed.");
}
