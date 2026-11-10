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

/**
 * Budgets: see "Quality bar" in .agents/plans/00-web-agents-roadmap.md.
 *
 * Phase 14 (.agents/plans/14-imperative-tools.md): the visuals needed no raise (9.21 KB with the field step for
 * tools). The whole package measures 15.76 KB with the locator, `createWebAgents`, URL tracking, flags and `invoke`;
 * its budget was raised from 13 KB to 16 KB (decided 2026-11-09, above the 14.25 KB the plan first estimated), then
 * to 16.25 KB for two additions: `inspectTools` for the devtools (15.99 KB) and deferring URL notices out of React's
 * insertion effects, a Next.js fix (16.02 KB).
 *
 * The provider loads the polyfill itself (decided 2026-11-10): `loadWebMCPPolyfill`, `whenModelContext`, the queue
 * that keeps a registration made before `document.modelContext` exists, and createWebAgents' `polyfill` option add
 * about 280 B (16.29 KB), so the whole-package budget went from 16.25 KB to 16.5 KB. The polyfill itself (about
 * 2.5 KB) is a chunk reached only by dynamic import: it is reported, not counted, since browsers with WebMCP never
 * download it.
 */
const CHECKS = [
  { name: "visuals (installAgentVisuals, onAgentEvent)", exports: "{ installAgentVisuals, onAgentEvent }", budget: 9.25 * KB },
  { name: "whole package", exports: "*", budget: 16.5 * KB },
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
    const chunks = (Array.isArray(out) ? out[0] : out).output.filter((o) => o.type === "chunk");
    const gz = (chunk) => gzipSync(chunk.code, { level: 9 }).length;
    // What a page downloads up front: the entry and what it imports statically. A chunk reached only by a dynamic
    // import (the polyfill, which `loadWebMCPPolyfill` loads where the browser has no WebMCP) is reported apart.
    const main = chunks.find((c) => c.isEntry);
    const upFront = new Set([main.fileName, ...main.imports]);
    return {
      bytes: chunks.filter((c) => upFront.has(c.fileName)).reduce((sum, c) => sum + gz(c), 0),
      lazy: chunks.filter((c) => !upFront.has(c.fileName)).map((c) => ({ name: c.name, bytes: gz(c) })),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

let failed = false;
for (const check of CHECKS) {
  const { bytes, lazy } = await size(check.exports);
  const ok = bytes <= check.budget;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${check.name}: ${(bytes / KB).toFixed(2)} KB min+gz, ${bytes} B (budget ${check.budget / KB} KB)`);
  for (const chunk of lazy) console.log(`     + loaded on demand, not counted: ${chunk.name} ${(chunk.bytes / KB).toFixed(2)} KB min+gz`);
}
if (failed) process.exit(1);
