/**
 * Bundle-size budget for @webmcp-agents/core, min+gz, measured as a consumer's
 * bundler would see it: each check re-exports some names from src/index.ts,
 * so tree-shaking keeps only what that import pulls in.
 *
 *   pnpm --filter @webmcp-agents/core size
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const KB = 1024;
const index = fileURLToPath(new URL("../src/index.ts", import.meta.url));

/** Budgets: see "Quality bar" in .agents/plans/00-web-agents-roadmap.md. */
const CHECKS = [
  { name: "visuals (installAgentVisuals, onAgentEvent)", exports: "{ installAgentVisuals, onAgentEvent }", budget: 9.25 * KB },
  { name: "whole package", exports: "*", budget: 13 * KB },
];

async function size(exports) {
  // A real file (not a virtual module): Vite's lib mode resolves the entry from disk.
  const dir = await mkdtemp(join(tmpdir(), "web-agents-size-"));
  const entry = join(dir, "entry.js");
  await writeFile(entry, `export ${exports} from ${JSON.stringify(index)};`);
  try {
    const out = await build({
      configFile: false,
      logLevel: "silent",
      build: { write: false, minify: true, lib: { entry, formats: ["es"], fileName: "out" } },
    });
    const code = (Array.isArray(out) ? out[0] : out).output.find((o) => o.type === "chunk").code;
    return gzipSync(code, { level: 9 }).length;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

let failed = false;
for (const check of CHECKS) {
  const bytes = await size(check.exports);
  const ok = bytes <= check.budget;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${check.name}: ${(bytes / KB).toFixed(2)} KB min+gz, ${bytes} B (budget ${check.budget / KB} KB)`);
}
if (failed) process.exit(1);
