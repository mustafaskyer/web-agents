// cursor.css carries Chrome's native WebMCP pseudo-classes (`:tool-form-active`), which Turbopack's CSS parser refuses
// inside the Tailwind pipeline. Serve the file as a static asset instead: copied here before dev and build.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "..", "public", "web-agents");
mkdirSync(target, { recursive: true });
copyFileSync(require.resolve("@webmcp-agents/core/cursor.css"), join(target, "cursor.css"));
