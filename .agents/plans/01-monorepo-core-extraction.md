# Feature: Turborepo monorepo, `@web-agents/core` + `/polyfill` extraction, and "cursor yields to the user"

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

Read `.agents/plans/00-web-agents-roadmap.md` first: it fixes package names, versions and public contracts.

## Feature Description

Turn the single Vite app into a pnpm + Turborepo monorepo. The framework-agnostic visual layer
(`src/agent-visuals/*`) becomes the publishable `@web-agents/core` package, the dev polyfill becomes
`@web-agents/polyfill`, the dev console moves (unchanged) into `@web-agents/devtools` (rebuilt in Phase 3), and the
current storefront becomes `apps/playground`. On the way, core gets what a library needs and the app never did:
teardown (`destroy()`), SSR-safe imports, a typed event bus (`onAgentEvent`), and the fix for issue #1:
**when the user moves the mouse, scrolls, touches or types, the agent cursor gets out of the way immediately**,
while the tool still completes. Tooling is modernised in the same move: React 19, Vite 8, TS 6, tsdown, Biome,
Vitest 5 (node + browser mode).

## User Story

As a developer who wants agent-visible WebMCP tools in my app
I want to `pnpm add @web-agents/core` and call `installAgentVisuals()` (and tear it down again)
So that I get the ghost cursor without copying files, and my users never fight the agent's cursor for control.

## Problem Statement

- Everything lives in one app; nothing is reusable or publishable, and there are no tests, linter or CI.
- `installAgentVisuals` is a one-shot singleton (`let installed`, `src/agent-visuals/index.ts:108,166`) with no
  teardown: listeners (`:247`, `:327`, `onLifecycle` `:115`), the 400 ms `setInterval` (`:205`) and the
  `registerTool` wrapper (`:426`) live forever; `cursor.ts:41` calls `matchMedia` at import time (crashes SSR).
  A React provider (Phase 2), devtools and tests all need install → destroy → install.
- Issue #1: while the agent animates, a real user moving the mouse sees two cursors competing; the agent cursor
  keeps gliding/typing and in `sync` mode the page even waits for it.

## Solution Statement

1. Monorepo skeleton (pnpm workspaces, Turborepo `tasks`, root Biome, `tsconfig.base.json` with the
   `"@web-agents/source"` custom condition so apps and typecheck resolve package **source**; tsdown builds `dist`).
2. Move files with `git mv` (keeps history), then refactor core minimally: lifecycle with an `AbortController`,
   ref-counted install, lazy `matchMedia`, `GhostCursor.destroy()`, event bus, and a `user-yield.ts` module.
3. Yield-to-user: trusted `pointermove` (beyond a small threshold) / `pointerdown` / `wheel` / `touchstart` /
   `keydown` → the cursor, tag and spotlight fade out in ≤ 90 ms, and **every pending animation step fast-forwards**
   (moves resolve at once, typing writes the final value, `click(onPress)` calls `onPress` immediately) so held
   submits and gated `execute()` calls release right away. After `resumeAfter` ms without user input, the next tool
   call shows the cursor again, entering from the user's last pointer position.
4. Tests: node unit tests for `motion.ts`, Vitest browser-mode tests for visuals, polyfill and yield.

## Feature Metadata

**Feature Type**: Refactor + Bug Fix (issue #1) + New Capability (packaging, events, teardown)
**Estimated Complexity**: High
**Primary Systems Affected**: whole repo layout; `src/agent-visuals/*`, `dev/*`, build/test tooling
**Dependencies**: turbo, tsdown, typescript ~6.0.3, vite 8, @vitejs/plugin-react 6, react 19.3, vitest 5,
@vitest/browser-playwright 5, playwright (chromium), @biomejs/biome 2.6

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `README.md` (whole) — Why: documents every behaviour of the visual layer (sync mode, event order differences
  native vs polyfill, gating, spotlight). Behaviour must not change except for yield-to-user.
- `src/agent-visuals/index.ts`
  - lines 1-22 — module doc; keep it (update the "Signals" list with the yield inputs).
  - lines 27-57 — `AgentVisualsLogEntry`, `AgentVisualsOptions`, `AgentVisuals`: become `AgentEvent` (roadmap) + new options.
  - lines 60-62, 108, 158-168 — module-level `controller`/`installed`: replace with ref-counted instance.
  - line 115-119 `onLifecycle` — must accept a `signal` so listeners are removed on destroy.
  - lines 186-205 — `snapshotIdle` + `setInterval`: clear on destroy; skip when `document.hidden`.
  - lines 247-262, 327-414 — capture listeners on `document`: pass `{ capture: true, signal }`.
  - lines 420-431 — `registerTool` wrapper: restore the original on destroy (only if still ours).
  - lines 435-471 — `runGated`: emits start/result/error; add `ms`.
  - lines 476-491 `playFields`, 495-510 `typeInto` — must short-circuit when yielded.
  - lines 513-525 `finish`.
- `src/agent-visuals/cursor.ts`
  - lines 41-46 — `reducedMotion` at import (SSR hazard) and `wait()`.
  - lines 196-224 `moveTo`, 269-282 `click`, 301-314 `park/unpark`, 316-336 `hide`, 339-366 `ensure`,
    409-416 `frame` loop, 543 singleton `agentCursor`.
- `src/agent-visuals/motion.ts` (whole, 119 lines) — pure; first unit-test target.
- `src/agent-visuals/cursor.css` — line 29/116/132/161 transitions; line 181 styles **every** `form` on the page
  (leaks into host apps → scope it to `form[toolname]`); line 191 reduced-motion block.
- `src/types/webmcp.d.ts` — ambient WebMCP types (lines 8-104) + React JSX augmentation (lines 106-115).
- `dev/webmcp-polyfill.ts` — line 40 class, line 101 `if (!document.modelContext)` install block, line 198 MutationObserver.
- `dev/agent-console.ts` — moved verbatim; its `execute()` (lines ~117-135) handles object-vs-string args.
- `src/main.tsx` — install order (polyfill → visuals → render → console). Keep this order in the playground.
- `src/tools/*.tsx`, `src/store.tsx`, `src/App.tsx`, `src/app.css` — moved verbatim into `apps/playground/src`.
- `tsconfig.json` — strict flags to carry into `tsconfig.base.json`.
- `.gitignore` — currently ignores `pnpm-lock.yaml` and `pnpm-workspace.yaml` (**wrong for a monorepo: un-ignore both**).
- `.claude/skills/agent-browser/SKILL.md`, `.claude/skills/e2e-test/SKILL.md` — manual validation tooling.

### New Files to Create

```
pnpm-workspace.yaml (rewrite)   turbo.json   biome.json   tsconfig.base.json   vitest.config.ts
package.json (rewrite, private root)
packages/core/{package.json,tsconfig.json,tsdown.config.ts,vitest.config.ts,README.md}
packages/core/src/{index.ts,visuals.ts,cursor.ts,motion.ts,events.ts,user-yield.ts,webmcp.ts,cursor.css}
packages/core/src/{motion.test.ts,events.test.ts,visuals.browser.test.ts,user-yield.browser.test.ts,test-utils.ts}
packages/polyfill/{package.json,tsconfig.json,tsdown.config.ts,vitest.config.ts,README.md}
packages/polyfill/src/{index.ts,auto.ts,polyfill.browser.test.ts}
packages/devtools/{package.json,tsconfig.json,tsdown.config.ts}  packages/devtools/src/{index.ts,console.ts}
apps/playground/{package.json,tsconfig.json,vite.config.ts,index.html}
apps/playground/src/{main.tsx,App.tsx,store.tsx,app.css,jsx-webmcp.d.ts,tools/*}
```

Removed after the move: root `src/`, `dev/`, `index.html`, `vite.config.ts`, `tsconfig.json`, `dist/`.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Turborepo — configuring tasks](https://turborepo.com/docs/crafting-your-repository/configuring-tasks) — `tasks`, `dependsOn: ["^build"]`, `persistent`.
- [Turborepo — internal packages](https://turborepo.com/docs/core-concepts/internal-packages#compiled-packages) — compiled vs JIT; we compile + use a source condition.
- [pnpm workspaces](https://pnpm.io/workspaces#workspace-protocol-workspace) — `workspace:*`.
- [TypeScript `customConditions`](https://www.typescriptlang.org/tsconfig/#customConditions) — needs `moduleResolution: "bundler"`.
- [Vite `resolve.conditions`](https://vite.dev/config/shared-options#resolve-conditions) — append to `defaultClientConditions` from `vite`.
- [tsdown — getting started / config](https://tsdown.dev/guide/) and [tsdown CSS (experimental)](https://tsdown.dev/options/css#css-support) — we **copy** the CSS instead; check the `copy` option name in the current docs.
- [Vitest browser mode](https://vitest.dev/guide/browser/#configuration) and [projects](https://vitest.dev/guide/projects#defining-projects); [interactivity API `userEvent`](https://vitest.dev/guide/browser/interactivity-api) — produces **trusted** events via Playwright (needed to test yield).
- [Biome configuration](https://biomejs.dev/reference/configuration/) — `biome ci`.
- [Pointer events / `isTrusted`](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted) — synthetic `input`/`change` our code dispatches are untrusted and must not trigger yield.
- [Chrome WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api#discover-tools) — event target / `executeTool` shapes.

### Patterns to Follow

**Naming**: kebab-case files, camelCase functions, PascalCase types/classes; options interfaces `XxxOptions`;
TSDoc `/** … */` on every exported symbol and option (see `AgentVisualsOptions` in `src/agent-visuals/index.ts:37-57`).
Comment density: short "why" comments, section banners `// ---------- n. title ----------` (index.ts:245, 264, 320).

**Feature detection, not assumptions** (index.ts:115-119):
```ts
function onLifecycle(type: LifecycleEvent, listener: (ev: ToolEvent) => void): void {
  const mc = document.modelContext;
  const target: EventTarget = mc && `on${type}` in mc ? mc : window;
  target.addEventListener(type, listener as EventListener);
}
```
→ becomes `onLifecycle(type, listener, signal)` with `{ signal }`.

**Writes like a user** (index.ts:176-185) — native setter + `input`/`change`, guarded by `writing`. Keep it.

**Defensive pseudo-class probes** (index.ts:137-143 `queryPseudo`). Keep it.

**Errors become readable agent results** (`src/store.tsx` `settle`, `errorMessage`) — app-level, stays in playground.

**Reduced motion everywhere** (`cursor.ts:45` `wait` collapses to 0; `cursor.css:191`).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation — workspace and tooling
Root config, git hygiene, workspace manifests, install. Nothing moves yet.

### Phase 2: Move code (history-preserving)
`git mv` into `packages/*` and `apps/playground`; wire package exports + the source condition; playground runs
exactly as before. **Commit here** (pure move, easy to review).

### Phase 3: Core library hardening
SSR-safe imports, ref-counted install + `destroy()`, event bus, CSS scoping, idle-cost fixes.

### Phase 4: Yield to user (issue #1)
`user-yield.ts` detector + `GhostCursor.yield()/resume()` + fast-forward of runs.

### Phase 5: Testing & validation
Node + browser tests, build all packages, manual run with agent-browser, `/create-rules` → CLAUDE.md.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.
Work on branch `feat/monorepo-plus-examples` (already checked out). Use `git mv` for every move.

### 1. UPDATE `.gitignore`

- **IMPLEMENT**: remove `pnpm-lock.yaml` and `pnpm-workspace.yaml` lines; add `.turbo/`, `coverage/`,
  `packages/*/dist/`, `apps/*/dist/`, `__screenshots__/`, `.vercel/`, `*.tsbuildinfo`, `.vitest-attachments/`.
  Keep `dist/` and `node_modules/`.
- **GOTCHA**: the root `dist/` folder is a stale build of the old app; `rm -rf dist` (it is ignored, not tracked).
- **VALIDATE**: `git check-ignore pnpm-lock.yaml; test $? -eq 1 && echo ok`

### 2. CREATE `pnpm-workspace.yaml` (rewrite)

- **IMPLEMENT**:
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
  allowBuilds:
    esbuild: true
  ```
  Keep the existing `allowBuilds` key; add `playwright` / `@biomejs/biome` / `@parcel/watcher` entries only if
  `pnpm install` reports them as blocked builds.
- **VALIDATE**: `cat pnpm-workspace.yaml`

### 3. CREATE `tsconfig.base.json`

- **IMPLEMENT**: copy `compilerOptions` from `tsconfig.json`, then: remove `types`/`include`; add
  `"customConditions": ["@web-agents/source"]`, `"declaration": true`, `"verbatimModuleSyntax": true`,
  `"resolveJsonModule": true`. Keep `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`,
  `noImplicitOverride`, `noUncheckedSideEffectImports`, `isolatedModules`, `skipLibCheck`, `noEmit`,
  `moduleResolution: "bundler"`, `module: "ESNext"`, `target: "ES2022"`, `lib: ["ES2023","DOM","DOM.Iterable"]`, `jsx: "react-jsx"`.
- **GOTCHA**: `verbatimModuleSyntax` forces `import type` for type-only imports. Existing code already uses
  `type` modifiers (`import { …, type Vec }`), but check `src/store.tsx` / tools on move. TS 6 may warn on
  deprecated options — fix warnings, don't silence them.
- **VALIDATE**: `node -e "JSON.parse(require('fs').readFileSync('tsconfig.base.json','utf8'))" && echo ok`

### 4. CREATE root `package.json` (rewrite) + `turbo.json` + `biome.json`

- **IMPLEMENT** `package.json`:
  ```json
  {
    "name": "web-agents",
    "private": true,
    "type": "module",
    "packageManager": "pnpm@11.9.0",
    "engines": { "node": ">=22.12" },
    "scripts": {
      "dev": "turbo run dev --filter=playground...",
      "build": "turbo run build",
      "typecheck": "turbo run typecheck",
      "test": "turbo run test",
      "lint": "biome check .",
      "format": "biome format --write .",
      "check": "biome ci . && turbo run typecheck test build"
    },
    "devDependencies": {
      "@biomejs/biome": "^2.6.6",
      "turbo": "^2.11.10",
      "typescript": "~6.0.3",
      "vitest": "^5.1.0",
      "@vitest/browser": "^5.1.0",
      "@vitest/browser-playwright": "^5.1.0",
      "playwright": "^1.65.0"
    }
  }
  ```
  `turbo.json`:
  ```json
  {
    "$schema": "https://turborepo.com/schema.json",
    "globalDependencies": ["tsconfig.base.json"],
    "tasks": {
      "build":     { "dependsOn": ["^build"], "outputs": ["dist/**"] },
      "dev":       { "cache": false, "persistent": true },
      "typecheck": { "dependsOn": [] },
      "test":      { "outputs": ["coverage/**"] }
    }
  }
  ```
  `biome.json`: recommended rules, formatter `indentStyle: "space"`, `indentWidth: 2`, `lineWidth: 140`
  (existing code has long lines, e.g. index.ts:73), JS `quoteStyle: "double"`, `semicolons: "always"`,
  `trailingCommas: "all"`; `files.includes` excludes `**/dist`, `**/.turbo`, `pnpm-lock.yaml`, `.agents/**`, `.claude/**`.
- **GOTCHA**: `dev`/`typecheck` don't depend on `^build` because the source condition resolves `src/` directly.
  `build` of an app does depend on `^build` (Vite then resolves `dist` only if the condition isn't set — we
  **do** set it in the app, so app builds bundle source; `^build` stays to validate packages build).
  Confirm `packageManager` against `pnpm -v`.
- **VALIDATE**: `pnpm install && pnpm exec turbo --version && pnpm exec biome --version`

### 5. MOVE files with git

- **IMPLEMENT**:
  ```bash
  mkdir -p packages/core/src packages/polyfill/src packages/devtools/src apps/playground/src
  git mv src/agent-visuals/index.ts  packages/core/src/visuals.ts
  git mv src/agent-visuals/cursor.ts packages/core/src/cursor.ts
  git mv src/agent-visuals/motion.ts packages/core/src/motion.ts
  git mv src/agent-visuals/cursor.css packages/core/src/cursor.css
  git mv src/types/webmcp.d.ts       packages/core/src/webmcp.ts
  git mv dev/webmcp-polyfill.ts      packages/polyfill/src/index.ts
  git mv dev/agent-console.ts        packages/devtools/src/console.ts
  git mv src/App.tsx src/main.tsx src/store.tsx src/app.css apps/playground/src/
  git mv src/tools                   apps/playground/src/tools
  git mv index.html                  apps/playground/index.html
  git rm vite.config.ts tsconfig.json
  ```
- **GOTCHA**: if `git mv` fails because files are untracked (the session's initial `git status` showed them as
  untracked while `git log` shows commits), check `git ls-files src | head`; if untracked, use plain `mv`.
- **VALIDATE**: `test ! -d src && test ! -d dev && ls packages/*/src apps/playground/src`

### 6. SPLIT `packages/core/src/webmcp.ts` and CREATE `apps/playground/src/jsx-webmcp.d.ts`

- **IMPLEMENT**: `webmcp.ts` keeps `export {}; declare global { … }` (old lines 6-104). Move the
  `declare module "react" { interface HTMLAttributes<T> {…} }` block (old lines 106-115) into
  `apps/playground/src/jsx-webmcp.d.ts` (with `import "react";` at top so it's a module augmentation). Phase 2 moves it
  into `@web-agents/react`. Remove `Window.agent` from core's globals and put it in
  `packages/devtools/src/console.ts` as `declare global { interface Window { agent?: … } }`.
- **GOTCHA**: the `declare global` block must survive into `dist/index.d.mts`, or consumers lose the
  `document.modelContext` types. Approach, in order:
  1. Put `import "./webmcp";` as the first line of `index.ts` (side-effect import of a types-only module; the
     emitted JS is empty) and build. If the VALIDATE grep passes, stop here.
  2. If not, have tsdown copy `src/webmcp.ts` to `dist/webmcp.d.ts` (it is valid declaration syntax: interfaces
     only, no values) and prepend `/// <reference path="./webmcp.d.ts" />` to `dist/index.d.mts` via a tiny
     `onSuccess` hook in `tsdown.config.ts`. Add `dist/webmcp.d.ts` to `files`.
- **VALIDATE** (after task 9): `grep -q "modelContext" packages/core/dist/index.d.mts && echo ok`

### 7. CREATE `packages/core/src/index.ts`, `package.json`, `tsconfig.json`, `tsdown.config.ts`

- **IMPLEMENT** `index.ts` (public surface, roadmap names):
  ```ts
  import "./webmcp"; // global WebMCP types (see task 6)
  export { installAgentVisuals } from "./visuals";
  export type { AgentVisuals, AgentVisualsOptions, YieldOptions } from "./visuals";
  export type { SpotlightOptions } from "./cursor";
  export { UI_HOST_ATTR } from "./user-yield";
  export { onAgentEvent } from "./events";
  export type { AgentEvent } from "./events";
  ```
  `package.json`:
  ```json
  {
    "name": "@web-agents/core",
    "version": "0.1.0",
    "type": "module",
    "description": "Show users what a WebMCP agent is doing: ghost cursor, field replay, confirmation parking.",
    "license": "MIT",
    "sideEffects": ["**/*.css"],
    "files": ["dist"],
    "exports": {
      ".": { "@web-agents/source": "./src/index.ts", "types": "./dist/index.d.mts", "import": "./dist/index.mjs" },
      "./cursor.css": { "@web-agents/source": "./src/cursor.css", "default": "./dist/cursor.css" },
      "./package.json": "./package.json"
    },
    "scripts": {
      "build": "tsdown",
      "dev": "tsdown --watch",
      "typecheck": "tsc -p tsconfig.json",
      "test": "vitest run"
    },
    "devDependencies": { "tsdown": "^0.23.7" }
  }
  ```
  `tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "compilerOptions": { "types": ["vite/client"] }, "include": ["src"] }`
  — drop `vite/client` if no `import.meta.env` / `?inline` is used in core (it isn't after task 12).
  `tsdown.config.ts`:
  ```ts
  import { defineConfig } from "tsdown";
  export default defineConfig({
    entry: ["src/index.ts"],
    format: "esm",
    platform: "browser",
    dts: true,
    copy: [{ from: "src/cursor.css", to: "dist" }], // verify option shape in tsdown docs
    publint: true,
  });
  ```
- **GOTCHA**: `visuals.ts` currently has `import "./cursor.css";` (old index.ts:25). **Remove it** — CSS is an
  explicit consumer import (`import "@web-agents/core/cursor.css"`); tsdown's CSS bundling is experimental.
  Exclude `*.test.ts` from the build (entry is explicit, so it is).
- **VALIDATE**: `pnpm --filter @web-agents/core build && ls packages/core/dist`

### 8. CREATE `packages/polyfill` (index.ts already moved) + `auto.ts`

- **IMPLEMENT**: wrap the install block (old line 101 `if (!document.modelContext) { … }`) in
  `export function installWebMCPPolyfill(): ModelContext` that returns `document.modelContext` if present, else
  installs and returns the polyfill. Keep an `installed` guard. Export `PolyfillModelContext` class for tests.
  `auto.ts`: `import { installWebMCPPolyfill } from "./index"; installWebMCPPolyfill();`
  package.json mirrors core (name `@web-agents/polyfill`, exports `"."` and `"./auto"`, `"sideEffects": ["./dist/auto.mjs", "./src/auto.ts"]`),
  `peerDependencies: { "@web-agents/core": "workspace:^" }` is **not** needed — import the global types via
  `import type {} from "@web-agents/core";`? Simpler: add `@web-agents/core` as a **devDependency** (`workspace:*`)
  and put `import type {} from "@web-agents/core";` at the top of `index.ts` so the ambient types load.
- **GOTCHA**: don't change polyfill behaviour; the README "Notes and limits" describe event order the visuals
  depend on (polyfill: toolactivated → fill → submit).
- **VALIDATE**: `pnpm --filter @web-agents/polyfill build && pnpm --filter @web-agents/polyfill typecheck`

### 9. CREATE `packages/devtools` (console.ts already moved)

- **IMPLEMENT**: `index.ts`: `export { installAgentConsole } from "./console"; export type { AgentConsoleOptions } from "./console";`
  package.json like core (`@web-agents/devtools`, devDependency `@web-agents/core: workspace:*` for types).
  The console's styles currently live in `app.css`? Check: `grep -n agent-console apps/playground/src/app.css`;
  if they are in the app stylesheet, leave them there for now (Phase 3 rebuilds the panel with isolated styles).
- **VALIDATE**: `pnpm --filter @web-agents/devtools build && pnpm -r --filter "./packages/*" typecheck`

### 10. CREATE `apps/playground` manifest, Vite config, tsconfig; UPDATE `main.tsx`

- **IMPLEMENT** `apps/playground/package.json`:
  ```json
  {
    "name": "playground",
    "private": true,
    "type": "module",
    "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview", "typecheck": "tsc -p tsconfig.json" },
    "dependencies": {
      "@web-agents/core": "workspace:*",
      "react": "^19.3.1",
      "react-dom": "^19.3.1",
      "use-webmcp-tool": "^0.2.0"
    },
    "devDependencies": {
      "@web-agents/polyfill": "workspace:*",
      "@web-agents/devtools": "workspace:*",
      "@types/react": "^19.3.0",
      "@types/react-dom": "^19.3.0",
      "@vitejs/plugin-react": "^6.2.1",
      "vite": "^8.3.6"
    }
  }
  ```
  `vite.config.ts`:
  ```ts
  import { defineConfig, defaultClientConditions } from "vite";
  import react from "@vitejs/plugin-react";
  export default defineConfig({
    plugins: [react()],
    resolve: { conditions: ["@web-agents/source", ...defaultClientConditions] },
  });
  ```
  `tsconfig.json`: extends base, `"types": ["vite/client"]`, `include: ["src", "vite.config.ts"]`.
  `main.tsx`: replace `await import("../dev/webmcp-polyfill")` with `await import("@web-agents/polyfill/auto")`;
  replace `import { installAgentVisuals } from "./agent-visuals"` with
  `import { installAgentVisuals } from "@web-agents/core"; import "@web-agents/core/cursor.css";`;
  replace `await import("../dev/agent-console")` with `await import("@web-agents/devtools")`.
  `index.html`: unchanged (`/src/main.tsx` path is relative to the app root).
- **GOTCHA**: keep `use-webmcp-tool` at `^0.2.0` in this phase (behaviour-preserving move); Phase 2 evaluates 0.3.
  React 19: `createRoot` API unchanged; `@types/react` 19 removed the global `JSX` namespace — the augmentation in
  `jsx-webmcp.d.ts` targets `react`'s `HTMLAttributes`, which still works. `defaultClientConditions` is exported
  from `vite` ≥ 6; verify in Vite 8.
- **VALIDATE**: `pnpm --filter playground typecheck && pnpm --filter playground build`

### 11. Pure-move checkpoint

- **IMPLEMENT**: `pnpm install`, `pnpm lint --write` (format only; commit formatting separately if large),
  run `pnpm dev` and execute a tool through the console (see Level 4). Then commit:
  `refactor: move app into turborepo (apps/playground, packages/core|polyfill|devtools)` via `/commit`.
- **VALIDATE**: `pnpm typecheck && pnpm build`

### 12. REFACTOR `packages/core/src/cursor.ts` — SSR safety and teardown

- **IMPLEMENT**:
  - Replace `const reducedMotion = matchMedia(…)` (line 41) with a lazy getter:
    `let rm: MediaQueryList | undefined; export const reduced = () => (rm ??= matchMedia("(prefers-reduced-motion: reduce)")).matches;`
    guarded by `typeof matchMedia === "function"` (return false otherwise).
  - `wait(ms)` additionally resolves immediately when the cursor is yielded (`agentCursor.isYielded()`), see task 16.
  - Add `destroy(): void` to `GhostCursor`: `cancelAnimationFrame(this.raf)`, resolve `arrival`, remove the five
    DOM nodes created in `ensure()` and any `.agent-ripple`, reset state so `ensure()` can rebuild.
  - Export `class GhostCursor` (currently only `export type { GhostCursor }`) and keep `export const agentCursor`
    — but construct it lazily: `export const agentCursor = new GhostCursor()` is fine because the constructor
    touches no DOM (verify: fields only; `ensure()` creates DOM). Keep it.
- **PATTERN**: `ensure()` (line 339) is the single DOM creation point; `destroy()` is its inverse.
- **GOTCHA**: `hide()` awaits `wait(220)`; `destroy()` must not await — it's synchronous teardown.
- **VALIDATE**: `pnpm --filter @web-agents/core typecheck && node -e "import('./packages/core/src/motion.ts').catch(()=>0)"` (import-time safety is covered by test in task 19)

### 13. CREATE `packages/core/src/events.ts`

- **IMPLEMENT**:
  ```ts
  /** Everything the visual layer observes, in order. Devtools and chat subscribe to this. */
  export type AgentEvent = /* exactly the union in the roadmap */;
  const listeners = new Set<(e: AgentEvent) => void>();
  export function onAgentEvent(listener: (e: AgentEvent) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  /** @internal */
  export function emit(e: AgentEvent): void {
    for (const l of listeners) {
      try { l(e); } catch (err) { console.error("[web-agents] event listener threw", err); }
    }
  }
  ```
- **GOTCHA**: a throwing listener must never break a tool run.
- **VALIDATE**: covered by `events.test.ts` (task 18).

### 14. REFACTOR `packages/core/src/visuals.ts` — lifecycle, events, options

- **IMPLEMENT**:
  - Replace `AgentVisualsLogEntry` with `AgentEvent` from `./events`; keep `log` option and call both
    `log(e)` and `emit(e)` through one local `report(e)` helper. Add `at` to `start` (`performance.now()`),
    `ms` to `result`/`error` (now − run.startedAt), and emit `park` where `agentCursor.park(...)` is called (old line 315).
  - Ref-counted install: module-level `let active: { refs: number; controller: AgentVisuals; teardown(): void } | null`.
    `installAgentVisuals(opts)`: if `active`, `active.refs++` and return a **new handle** whose `destroy()` is
    idempotent and decrements; when refs hit 0 run `teardown()`. Options from later calls apply only
    `spotlight`/`yieldToUser` via the setters (document this in TSDoc).
  - One `AbortController` per install; pass `{ signal }` to every `addEventListener` (input, submit,
    lifecycle via `onLifecycle(type, listener, signal)`).
  - `setInterval(snapshotIdle, 400)` → store id; clear in teardown; inside, `if (document.hidden) return;`.
  - `registerTool` wrapper (old lines 420-431): keep `const original = mc.registerTool`; in teardown
    `if (mc.registerTool === wrapped) mc.registerTool = original;`.
  - Teardown also: `runs.clear()`, `agentCursor.destroy()`, `yieldDetector?.destroy()`.
  - `typeof document === "undefined"` → return a no-op handle (SSR).
  - Controller: `setSpotlight`, `setYieldToUser`, `destroy`.
- **PATTERN**: keep section structure 0-4 and comments; keep all timing constants.
- **GOTCHA**: tools already registered through the wrapper keep their wrapped `execute` after destroy; that's
  acceptable (they run immediately because `byTool` gating checks `runs`/cursor state — verify `runGated` still
  calls `tool.execute` when the cursor is destroyed: make `runGated` check a module `alive` flag and call through).
- **VALIDATE**: `pnpm --filter @web-agents/core typecheck && pnpm --filter playground build`

### 15. UPDATE `packages/core/src/cursor.css` — scope global selectors

- **IMPLEMENT**: line 181 `form { transition: … }` → `form[toolname] { … }` (and any other unscoped element
  selectors; grep `^[a-z]` selectors). Add `.agent-cursor.is-yielded, .agent-tag.is-yielded { transition-duration: 80ms; }`.
- **VALIDATE**: `grep -nE "^(form|button|input)[ ,{]" packages/core/src/cursor.css; test $? -eq 1 && echo scoped`

### 16. CREATE `packages/core/src/user-yield.ts` + ADD `yield()/resume()/isYielded()` to `GhostCursor`

Load the `motion` and `interaction` skills before this task.

- **IMPLEMENT** `user-yield.ts`:
  ```ts
  export interface YieldOptions {
    /** Pointer travel (px) that counts as "the user is moving". Ignores sensor jitter. Default 6. */
    moveThreshold?: number;
    /** Quiet time (ms) after the user's last input before the cursor may appear again. Default 800. */
    resumeAfter?: number;
    /** Input inside an element matching this selector never yields. Default `[data-web-agents-ui]`. */
    ignore?: string;
  }
  /** Marks library UI hosts (devtools, chat). Exported from index.ts. */
  export const UI_HOST_ATTR = "data-web-agents-ui";
  export type YieldReason = "pointer" | "keyboard" | "wheel" | "touch";
  export function watchUserInput(
    onInput: (reason: YieldReason, at: { x: number; y: number } | null) => void,
    { moveThreshold = 6 }: YieldOptions,
    signal: AbortSignal,
  ): void
  ```
  Listen on `window`, `{ capture: true, passive: true, signal }`: `pointermove` (only `e.isTrusted`,
  `pointerType !== "touch"`; accumulate `Math.hypot(movementX, movementY)` and fire once the sum ≥ threshold within
  150 ms), `pointerdown`, `wheel`, `touchstart`, `keydown` (ignore `e.repeat`; ignore bare modifier keys
  Shift/Control/Alt/Meta). Ignore input whose `e.composedPath()` contains an element matching
  `ignore` (default `[data-web-agents-ui]`; check `n instanceof Element && n.matches(ignore)` per path node, which
  works across open shadow roots because the host is in the path) (devtools panel / chat widget hosts, see the roadmap "Shared UI convention"): the
  user is driving the agent there, so the cursor must stay. Ignore everything with `!e.isTrusted` (our `writeField` dispatches untrusted events;
  the polyfill fills fields with untrusted events). Throttle `onInput` to once per animation frame.
  - In `GhostCursor`: `yield(at)` — sets `yielded = true`, `lastUserPoint = at`; adds `is-yielded` and removes
    `is-visible` on cursor, tag and spotlight; `highlight(null)` **unless parked** (keep the waiting ring on the
    confirm button so the user knows where to click); resolves `arrival`; clears `travel`/`aim`.
    `resume()` — `yielded = false`. `isYielded()`.
    `moveTo` while yielded: resolve immediately without showing anything (still `revealIfNeeded`? **no** —
    never scroll the page under a user who is interacting). `click(onPress)` while yielded: call `onPress`
    synchronously, no ripple. `park()` while yielded: update the live region text only.
    `appear(goal)` after a yield: start from `lastUserPoint` (document coords) instead of a random offset.
  - In `visuals.ts`: create the detector when `yieldToUser !== false`; on input:
    `agentCursor.yield(point); report({ type: "yield", reason })`; restart a `resumeAfter` timer that calls
    `agentCursor.resume(); report({ type: "resume" })`. In `typeInto`, check `agentCursor.isYielded()` each
    iteration and write the final value at once. `setYieldToUser(false)` destroys the detector and resumes.
- **GOTCHA**:
  - Never yield on the user's click that **confirms** a parked tool in a way that breaks the confirm: the click
    goes to the page normally; yield only changes visuals. Verify `place_order` still completes when the user
    moves to and clicks the button.
  - `sync` mode holds submits until `agentCursor.click(onPress)` → while yielded `onPress` runs immediately, so
    the held submit is re-dispatched right away (no 2.5 s gate wait).
  - Under `prefers-reduced-motion` yielding is still instant (no transition).
  - Keyboard users tabbing through the page must also make the cursor disappear (that's why `keydown` counts).
- **VALIDATE**: `pnpm --filter @web-agents/core typecheck` then task 20 tests.

### 17. CREATE test infrastructure: root `vitest.config.ts` + per-package configs

- **IMPLEMENT** root:
  ```ts
  import { defineConfig } from "vitest/config";
  export default defineConfig({ test: { projects: ["packages/*"] } });
  ```
  `packages/core/vitest.config.ts` — two projects (node unit + browser):
  ```ts
  import { defineConfig, defaultClientConditions } from "vite";
  import { playwright } from "@vitest/browser-playwright";
  export default defineConfig({
    resolve: { conditions: ["@web-agents/source", ...defaultClientConditions] },
    test: {
      projects: [
        { extends: true, test: { name: "core:unit", include: ["src/**/*.test.ts"], exclude: ["src/**/*.browser.test.ts"], environment: "node" } },
        { extends: true, test: { name: "core:browser", include: ["src/**/*.browser.test.ts"],
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] } } },
      ],
    },
  });
  ```
  Same browser setup for `packages/polyfill/vitest.config.ts`. Install browsers: `pnpm exec playwright install chromium`.
  `packages/core/src/test-utils.ts`: `fixtureForm(html)` mounts a form into `document.body` and returns cleanup;
  `untilAttr(el, name, present)` polls with `expect.poll`.
- **GOTCHA**: Vitest 5 browser defaults: `locators.exact` on, strict `toHaveTextContent`, un-awaited
  `expect.element` fails. Always `await expect.element(...)`. Nested `projects` inside a package config used as a
  root project: if Vitest rejects nesting, flatten into root `vitest.config.ts` with explicit project objects
  (`root: "packages/core"`).
- **VALIDATE**: `pnpm --filter @web-agents/core exec vitest run --project core:unit --passWithNoTests`

### 18. CREATE `packages/core/src/motion.test.ts` and `events.test.ts` (node)

- **IMPLEMENT**: `minimumJerk(0)===0`, `(1)===1`, monotonic over 0..1 in 0.05 steps, symmetric
  `mj(t)+mj(1-t)≈1`; `arcPoint` returns `from` at s=0 and `to` at s=1; `travelTime` clamps to [180, 650] and grows
  with distance and shrinks with size; `Spring`/`SpringSet` converge to target within 2 s of 1/240 steps and
  `isAtRest()` then; `clamp`/`lerp`. Events: listener receives, unsubscribe stops delivery, a throwing listener
  doesn't stop others (spy `console.error`).
- **VALIDATE**: `pnpm --filter @web-agents/core exec vitest run --project core:unit`

### 19. CREATE `packages/core/src/visuals.browser.test.ts`

- **IMPLEMENT** (import `installWebMCPPolyfill` from `@web-agents/polyfill` as a devDependency of core —
  add `"@web-agents/polyfill": "workspace:*"` to core devDependencies; this is test-only, no runtime cycle):
  1. install/destroy: after `destroy()` there are no `.agent-cursor`, `.agent-ring`, `.agent-spotlight` nodes;
     installing twice then destroying once keeps it alive (ref count); `document.modelContext.registerTool` is
     restored after the last destroy.
  2. declarative autosubmit form `<form toolname="t_add" toolautosubmit><input name="qty" type="number"></form>`
     with an `onsubmit` that calls `e.respondWith(Promise.resolve("ok"))`: `executeTool("t_add", {qty: 3})`
     resolves to a result containing "ok"; events seen in order `start → fill → result`; the field ends at "3";
     the page's submit handler ran **after** the `fill` event (sync mode holds it).
  3. confirm form (no `toolautosubmit`): a `park` event fires; the submit button has `data-tool-submit-active`;
     `userEvent.click(button)` completes the call.
  4. imperative gated tool: `registerTool({ name: "t_clear", execute })` + `<button toolname="t_clear">`;
     `execute` is called only after a `start` event and before `result`; with no element on screen it runs immediately.
  5. cancel: `cancelTool` mid-run → `cancel` event, cursor hidden (`.agent-cursor` lacks `is-visible` after 300 ms).
  6. SSR-ish import safety: `await import("./cursor")` with `globalThis.matchMedia` temporarily deleted does not throw.
- **GOTCHA**: each test must `destroy()` in `afterEach` and remove fixtures; reset the polyfill by creating a fresh
  `PolyfillModelContext` per test if registry state leaks (or use unique tool names per test).
- **VALIDATE**: `pnpm --filter @web-agents/core exec vitest run --project core:browser`

### 20. CREATE `packages/core/src/user-yield.browser.test.ts`

- **IMPLEMENT** with `userEvent` from `vitest/browser` (trusted input through Playwright):
  1. Start a run on an autosubmit form with a long value (`"abcdefghijklmnopqrstuvwxyz"`); while the cursor is
     visible, `await userEvent.hover(document.body)` (or a pointer move ≥ 10 px) → within 150 ms
     `.agent-cursor` has no `is-visible`, a `yield` event fired, and the tool **resolves in < 600 ms** total from
     the yield (fast-forward; typing would take ~1 s+).
  2. Synthetic `input`/`pointermove` events dispatched from script (`isTrusted === false`) do **not** yield.
  3. Pointer jitter < threshold (move 2 px) does not yield.
  4. `keydown` Tab yields; bare `Shift` does not.
  5. After `resumeAfter` (set 100 ms in the test) of quiet, a new tool call shows the cursor again and a `resume`
     event fired.
  6. Parked confirm + yield: the waiting ring stays (`.agent-ring.is-visible`), cursor hidden, user click completes.
  7. `setYieldToUser(false)`: pointer moves no longer hide the cursor.
  8. Clicks/typing inside an element with `data-web-agents-ui` (including inside its open shadow root) do not yield.
- **VALIDATE**: `pnpm --filter @web-agents/core exec vitest run --project core:browser`

### 21. CREATE `packages/polyfill/src/polyfill.browser.test.ts`

- **IMPLEMENT**: schema from a form (number with min/max → integer + minimum/maximum; select → enum; checkbox →
  boolean; `toolparamdescription` wins over `<label>`; `required`); removing the form unregisters
  (`toolchange` fired, `getTools()` empty); `executeTool(toolObject, "{\"qty\":2}")` (Chrome string shape) works;
  autosubmit vs paused submit; `cancelTool` rejects with `AbortError` and emits `toolcancel`;
  `installWebMCPPolyfill()` returns the existing object when called twice.
- **VALIDATE**: `pnpm --filter @web-agents/polyfill test`

### 22. UPDATE docs

- **IMPLEMENT**: root `README.md` → monorepo overview (layout, `pnpm dev`, `pnpm check`, package table, link to
  `.agents/plans/`), and move the visual-layer documentation (current sections "The three layers" … "Notes and
  limits") into `packages/core/README.md` with updated imports (`@web-agents/core`,
  `import "@web-agents/core/cursor.css"`), a new **"Yielding to the user"** section (options, behaviour, events), and
  a **"Teardown"** section. `packages/polyfill/README.md`: 15 lines. Update `TODO.md`: tick #1 and issue #1.
- **VALIDATE**: `grep -n "yieldToUser" packages/core/README.md`

### 23. Final checks, CLAUDE.md, commit

- **IMPLEMENT**: run every command in VALIDATION COMMANDS. Then run `/create-rules` to generate `CLAUDE.md` from the
  new layout (include: commands, the `@web-agents/source` condition, "never touch `document.modelContext` outside
  core/polyfill/devtools/chat", test naming `*.browser.test.ts`, plans live in `.agents/plans/`). Then `/code-review`,
  `/simplify`, `/commit`.
- **VALIDATE**: `pnpm check`

---

## TESTING STRATEGY

### Unit Tests (Vitest, node)
`motion.ts` maths and springs; `events.ts` bus. Fast, deterministic, no DOM.

### Integration Tests (Vitest browser mode, chromium)
Real layout/rAF/SubmitEvent: full tool runs through the polyfill + visuals (declarative autosubmit, confirm
park, imperative gate, cancel), install/destroy/ref-count, yield-to-user with trusted `userEvent` input, polyfill
schema + lifecycle.

### Edge Cases
- Two installs, one destroy; destroy during a running tool (pending `execute` must still settle).
- Yield mid-typing, mid-travel, while parked, during the post-click linger; yield → resume → new run appears from
  the user's pointer position.
- Untrusted events never yield; modifier-only keys and pointer jitter never yield; touch `pointermove` ignored but
  `touchstart` yields.
- Tab hidden: snapshot interval does no work.
- Import without `matchMedia`/`document` (SSR) does not throw; `installAgentVisuals()` returns a no-op handle.
- Reduced motion: all of the above still pass (emulate via `page.emulateMedia` if exposed, else skip with note).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```bash
pnpm install --frozen-lockfile=false
pnpm exec biome ci .
pnpm typecheck
```

### Level 2: Unit Tests
```bash
pnpm --filter @web-agents/core exec vitest run --project core:unit
```

### Level 3: Integration Tests
```bash
pnpm exec playwright install chromium
pnpm test
pnpm build && ls packages/core/dist packages/polyfill/dist packages/devtools/dist apps/playground/dist
grep -q "modelContext" packages/core/dist/index.d.mts && echo "types ok"
test -f packages/core/dist/cursor.css && echo "css ok"
```

### Level 4: Manual Validation (agent-browser skill)
```bash
pnpm dev &   # http://localhost:5173
agent-browser open http://localhost:5173
agent-browser eval 'agent.run("add_to_cart_mug-01", { qty: 3 })'
agent-browser screenshot /tmp/p1-add.png          # cursor on "Add to cart", cart shows 3 × Enamel mug
agent-browser eval 'agent.run("apply_promo", { code: "123" })'
agent-browser eval 'setTimeout(() => {}, 0); agent.run("add_to_cart_tee-02", { qty: 12 })'
agent-browser mouse move 400 300                  # mid-run: cursor must vanish immediately; cart still updates
agent-browser screenshot /tmp/p1-yield.png
```
Check by eye in a real browser too: run `place_order`, move the mouse to the button → agent cursor disappears,
waiting ring stays, click completes the order. Repeat with DevTools "Emulate CSS prefers-reduced-motion".
Bundle size: `gzip -c packages/core/dist/index.mjs | wc -c` ≤ 9216.

### Level 5: Additional Validation (Optional)
Use the `e2e-test` skill against `apps/playground`.

---

## ACCEPTANCE CRITERIA

- [ ] `pnpm dev` starts the playground; all five tools behave exactly as documented in the old README.
- [ ] `@web-agents/core`, `@web-agents/polyfill`, `@web-agents/devtools` build with tsdown, pass `publint`, ship `.d.mts`
      with the WebMCP global types, and core ships `dist/cursor.css`.
- [ ] `installAgentVisuals()` returns a handle with `setSpotlight`, `setYieldToUser`, `destroy`; ref-counted; teardown
      removes every node, listener, interval and the `registerTool` wrapper.
- [ ] Importing core in a non-DOM environment doesn't throw.
- [ ] `onAgentEvent` delivers `start/fill/park/result/error/cancel/yield/resume` with the roadmap payloads.
- [ ] Issue #1: trusted user pointer/keyboard/wheel/touch input hides the agent cursor in ≤ 150 ms and the running tool
      completes without waiting for animations; synthetic events and jitter don't trigger it.
- [ ] `biome ci`, typecheck, unit + browser tests, build all pass from a clean clone.
- [ ] core ≤ 9 KB min+gz; no rAF or interval work while idle/hidden.
- [ ] README split (root vs `packages/core/README.md`), `CLAUDE.md` generated, `TODO.md` updated.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + browser)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works (incl. yield on a real mouse)
- [ ] Acceptance criteria all met
- [ ] `/code-review` + `/simplify` run; commits made with `/commit` (move commit separate from refactor commits)

---

## NOTES

- **Why a source condition instead of JIT packages**: JIT packages can't be published; compiled-only packages make
  `pnpm dev` wait for `tsdown --watch`. The `"@web-agents/source"` condition gives instant HMR into package source
  and identical published output. TS `customConditions` makes `tsc` resolve the same files.
- **Why the CSS stays a separate import**: tsdown CSS bundling is experimental, and an explicit import lets host
  apps control order/cascade layers. Phase 2's `<WebAgentsProvider>` can import it for React users automatically.
- **Yield semantics are visual only**: we never cancel the agent's call because the user moved — that would make
  agent tools flaky. The page is the source of truth; the cursor is decoration that must never compete with a human.
- **Polyfill and `use-webmcp-tool`**: behaviour preserved in this phase; Phase 2 reconsiders `use-webmcp-tool` 0.3
  versus our own `registerWebTool`.
- Risks: Vitest nested `projects` config shape (flatten if needed); tsdown `copy` option name; global type
  emission in `.d.mts` (task 6 has an explicit check); TS 6 deprecation warnings.
- **Confidence: 8/10** for one-pass success (the move + tooling is mechanical; the yield fast-forward and
  ref-counted teardown are the parts most likely to need a second iteration).
