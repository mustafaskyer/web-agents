# Feature: Docs site with Blume (`apps/docs`)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> **Outward-facing actions need explicit user confirmation, every time:** `vercel link`, `vercel deploy`, any Vercel
> dashboard change, pushing branches, opening PRs. Everything else in this plan can be done without asking.

## Feature Description

Publish the existing API reference in `docs/` (73 Markdown files, one per public API, written for GitHub) as a real
documentation website built with [Blume](https://github.com/haydenbleasel/blume) 2.x, the Markdown-first docs
framework on Astro + Vite. A new private workspace `apps/docs` holds only the Blume config, folder meta and a Vercel
config. **The content stays where it is**: `content.root` points at `../../docs`, so `docs/` remains the single source
of truth that CLAUDE.md already tells every change to update ("update it with the API"), and it still reads well on
GitHub.

Blume adds, with no extra code: sidebar navigation inferred from folders, local Orama search, `llms.txt` /
`llms-full.txt`, a raw-Markdown copy of every page (`/core/define-web-tool.md`), a JSON docs API, "Copy as Markdown",
Open Graph images, sitemap and link validation. The AI-facing surface fits this project: the docs describe tools for
agents, and agents can now read them directly.

## User Story

As a developer adopting `@web-agents/*` (or an AI coding agent helping them)
I want a searchable, navigable docs website with machine-readable copies of every page
So that I can find an API (`defineWebTool`, `<AgentChat>`, error codes) without browsing a GitHub tree, and agents can
load the docs as Markdown / `llms.txt`.

## Problem Statement

`docs/` is only browsable on GitHub: no search, no cross-package sidebar, no `llms.txt`, and nothing deployable to link
from the package READMEs or npm pages.

## Solution Statement

`apps/docs` = a Blume project whose content root is the repo's `docs/`. The only edits to `docs/` are:

1. A 3-line YAML frontmatter `slug` on the 8 `README.md` files, so `docs/README.md` serves `/` and
   `docs/core/README.md` serves `/core` (without it they publish at `/README` and `/core/README`, and the site has no
   home page).
2. A tiny `meta.ts` per package folder (title + sidebar order), so the sidebar follows the package order of
   `docs/README.md` instead of alphabetical.

Everything else (titles from each file's `# H1`, `./define-web-tool.md` links → `/core/define-web-tool`) works
as-is. **This was verified with a throwaway spike** (Blume 2.2.7, pnpm 11.9, content root `../../docs`, a copy of
today's `docs/`): 74 pages built in ~7 s, `blume validate` → "No broken links found".

Deploy as a static site on Vercel (its own project, Root Directory `apps/docs`), mirroring the example apps.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium (small surface, but two verified toolchain gotchas)
**Primary Systems Affected**: new `apps/docs`, `docs/**/README.md` (frontmatter), `docs/*/meta.ts` (new),
`pnpm-workspace.yaml`, `.gitignore`, `.changeset/config.json`, `CLAUDE.md`, `docs/deploy.md`, `README.md`
**Dependencies**: `blume@^2.2.7` (pulls Astro 7, React 19, sharp, pagefind, …; Node ≥ 22.19)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `docs/README.md` - Why: becomes the home page; its "Packages" table defines the sidebar order.
- `docs/core/README.md` (and the 6 other `docs/<pkg>/README.md`) - Why: package landing pages; get `slug` frontmatter.
- `docs/deploy.md` - Why: Vercel setup for the apps; add a "Docs site" section in the same table style.
- `apps/flights/package.json` - Why: app package shape (`private`, `version: 0.0.0`, `type: module`, `engines`).
- `apps/flights/vercel.json` - Why: Vercel config pattern (`$schema`, `buildCommand: turbo run build`,
  `installCommand`, `ignoreCommand`, security `headers`). The docs one drops `framework: vite`, rewrites and functions.
- `pnpm-workspace.yaml` - Why: `allowBuilds` (esbuild already `true`) and `minimumReleaseAgeExclude`; add `sharp`,
  the `satteri` override, and Blume to the exclude list if pnpm asks.
- `turbo.json` - Why: tasks `build` (`outputs: dist/**`), `dev` (persistent), `typecheck`, `test`. Package-level
  `apps/docs/turbo.json` extends it to add `docs/` as a build input.
- `.changeset/config.json` - Why: `ignore` lists every private app; add `@web-agents/docs`.
- `.gitignore` - Why: add `.blume/` and `.blume-verify/` (generated Astro runtime).
- `biome.json` - Why: Markdown is excluded already; `docs/*/meta.ts` and `apps/docs/blume.config.ts` will be linted
  and formatted (double quotes, semicolons, 2-space indent, 140 cols).
- `.github/workflows/ci.yml` - Why: CI runs `pnpm turbo run typecheck test build size check-exports`; the docs app
  joins `build` (and `test`) automatically. No CI change needed.
- `CLAUDE.md` - Why: Commands, Project Structure and Gotchas sections need the docs app.

### New Files to Create

- `apps/docs/package.json` - private workspace `@web-agents/docs`, scripts `dev`/`build`/`test`/`preview`.
- `apps/docs/blume.config.ts` - Blume config (title, description, content root, github, theme, agents).
- `apps/docs/turbo.json` - package-level turbo config: `docs/**` as a build/test input.
- `apps/docs/vercel.json` - static deploy config incl. the Markdown content-type headers Blume would otherwise lose.
- `apps/docs/README.md` - one paragraph: what it is, `pnpm --filter @web-agents/docs dev`, where content lives.
- `docs/{core,react,polyfill,devtools,chat,local-agent,vercel-api}/meta.ts` - sidebar group title + order.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

Blume ships its own docs inside the package. After installing, find them with
`pnpm --filter @web-agents/docs exec node -e "console.log(require.resolve('blume/package.json'))"` (they are in
`docs/` beside it; pnpm puts `blume` under `apps/docs/node_modules`, not the root).

- `docs/01-quickstart.mdx` - pnpm workspace notes: folder must be in `packages`, esbuild needs `allowBuilds`.
- `docs/configuration/index.mdx` → "Content" (`content.root`, `include`, `exclude`), "GitHub" (`github.dir` for
  monorepos), "Last modified" (`VERCEL_DEEP_CLONE=true`), "SEO and agents".
- `docs/content/index.mdx` → "Files and routes", "Ordering with numeric prefixes".
- `docs/content/syntax.mdx` → "Links and images": relative `./x.md` links resolve to the page and are rewritten.
- `docs/content/frontmatter.mdx` → `slug` ("replaces the whole path"; `slug: index` → `/`, verified).
- `docs/content/meta.mdx` - `defineMeta({ title, order, pages, collapsed, icon })`.
- `docs/content/navigation.mdx` → "Ordering", "Repository link", "Tabs".
- `docs/02-deployment.mdx` → monorepo paragraph (Vercel Root Directory, keep "Include source files outside of the
  Root Directory" **on**), "Redirects" (Vercel never reads `dist/vercel.json`), "Content types".
- `docs/cli/index.mdx` - `blume dev | build | preview | validate | doctor`; `build` refuses while `dev` runs
  (`--isolated` exists).
- Turborepo package configurations + `$TURBO_ROOT$` in `inputs`: https://turborepo.com/docs/reference/package-configurations
  and https://turborepo.com/docs/reference/configuration#inputs - Why: make the docs build cache depend on `docs/**`.

### Patterns to Follow

**App `package.json`** (mirror `apps/flights/package.json`):

```json
{
  "name": "@web-agents/docs",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "blume dev",
    "build": "blume build",
    "preview": "blume preview",
    "test": "blume validate"
  },
  "dependencies": { "blume": "^2.2.7" },
  "engines": { "node": ">=22.19" }
}
```

**Vercel config** (mirror `apps/flights/vercel.json` minus SPA bits): `$schema`, `buildCommand: "turbo run build"`,
`outputDirectory: "dist"`, `installCommand: "pnpm install --frozen-lockfile"`, the two security headers.

**Comments:** short "why" comments only (CLAUDE.md). TSDoc is required on package exports, not on app config files;
a one-line comment per non-obvious config option is enough.

**Docs style:** `docs/deploy.md` uses `| Setting | Value |` tables and numbered `## n. …` sections.

---

## VERIFIED GOTCHAS (from the spike — do not rediscover)

1. **`satteri` version split breaks every page.** Blume 2.2.7 depends on `satteri@^0.10.5`, while the Astro it resolves
   (7.4.x, via `@astrojs/markdown-satteri@0.4.7`) uses `satteri@0.11.7`. Two copies → `blume build` fails with
   `HastReader was handed a buffer in wire format version 52 (expected 1), written by another satteri version` /
   `BLUME_BUILD_FAILED`. **Fix (verified):** a pnpm override to one version:
   ```yaml
   overrides:
     "blume>satteri": 0.11.7
   ```
   If the scoped selector doesn't dedupe (check `pnpm --filter @web-agents/docs why satteri` shows one version),
   use the global `satteri: 0.11.7` (that is what the spike used). Drop the override once a Blume release aligns them.
2. **README routes.** No frontmatter → `/README`, `/core/README`, and no `/` page at all (the home 404s). `slug: index`
   on `docs/README.md` → `/`; `slug: core` on `docs/core/README.md` → `/core`. Other pages' links to
   `./core/README.md` then resolve to `/core` automatically. GitHub renders frontmatter as a small table at the top of
   the file — accepted trade-off (the alternative, renaming to `index.md`, loses GitHub's folder README view).
3. **`meta.ts` outside the project works**, including `import { defineMeta } from "blume"` (Blume resolves it for
   files under the content root, verified). Keep the import for types/autocomplete.
4. **`blume check` crashes** (`@astrojs/astro2tsx` → `@emnapi/core` `instantiateNapiModuleSync`). Do **not** wire it
   into `typecheck`. The app has no `typecheck` script; `blume validate` is the `test` script (link checking).
5. **Vercel never reads `dist/vercel.json`.** A static build writes the Markdown content-type headers
   (`/(.*).md`, `/(.*).mdx` → `text/markdown; charset=utf-8`) and redirects there; copy the `headers` into
   `apps/docs/vercel.json`. Re-copy whenever `dist/vercel.json` changes after a Blume upgrade.
6. **Turbo cache must see `docs/`.** Turbo hashes only files inside the package by default, so an edit to
   `docs/core/define-web-tool.md` would replay a stale cached build. Add `$TURBO_ROOT$/docs/**` to `inputs`.
   Likewise `turbo-ignore` only sees the package folder, so the docs Vercel project uses a `git diff` ignore command.
7. **`blume build` refuses while `blume dev` runs** (they share `.blume/`). With `pnpm dev` running (it now includes
   the docs app), `pnpm check` fails in the docs build. Document it; `blume build --isolated` exists for ad-hoc checks.
8. **pnpm 11 `minimumReleaseAge`:** installing a fresh Blume may append `blume@x.y.z` to `minimumReleaseAgeExclude` in
   `pnpm-workspace.yaml` (pnpm did this in the spike). Keep it (matches the existing entries), or wait a day.
9. **`allowBuilds`:** `esbuild: true` is already there. pnpm 11 stops with `ERR_PNPM_IGNORED_BUILDS` for any other
   build script it hits (likely `sharp`, used for OG images and image optimization): add `sharp: true` if asked.
   Don't approve anything else without reading why it needs a build.
10. **Never commit `.blume/`** (generated Astro project) or `.blume-verify/`.
11. In `.md`, `{`/`<` are plain text (72 files contain braces). **Don't rename docs to `.mdx`**: braces would become
    JSX expressions and break the build (`BLUME_MDX_SYNTAX`).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation
Workspace + dependency + the two toolchain fixes. Goal: `pnpm --filter @web-agents/docs build` builds 74 pages.

### Phase 2: Core Implementation
Blume config, README slugs, folder meta, turbo inputs.

### Phase 3: Integration
Vercel config, changesets ignore, `.gitignore`, CLAUDE.md / README / deploy.md updates.

### Phase 4: Testing & Validation
`blume validate`, `pnpm check`, browse the dev server (search, sidebar order, a raw `.md` URL, `llms.txt`).

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE `apps/docs/package.json`

- **IMPLEMENT**: exactly the JSON in "Patterns to Follow". Scripts: `dev`, `build`, `preview`, `test`
  (`blume validate`). No `typecheck` script (gotcha 4).
- **PATTERN**: `apps/flights/package.json`
- **GOTCHA**: `apps/*` is already in `pnpm-workspace.yaml` `packages`; nothing to add there for discovery.
- **VALIDATE**: `pnpm install` (then see the next task if it fails on builds / release age)

### UPDATE `pnpm-workspace.yaml`

- **ADD** under `allowBuilds`: `sharp: true` only if `pnpm install` reports it as an ignored build (gotcha 9).
- **ADD** a top-level `overrides:` block with `"blume>satteri": 0.11.7` and a one-line comment
  `# blume 2.2.7 pins satteri 0.10 but its Astro uses 0.11: two copies break every page (drop once blume aligns them)`.
- **KEEP** any `blume@…` line pnpm appends to `minimumReleaseAgeExclude`.
- **VALIDATE**: `pnpm install && pnpm --filter @web-agents/docs why satteri` → exactly one version.

### UPDATE `.gitignore`

- **ADD** `.blume/` and `.blume-verify/`.
- **VALIDATE**: after the first build, `git status --porcelain apps/docs` lists no `.blume` or `dist` paths.

### CREATE `apps/docs/blume.config.ts`

- **IMPLEMENT**:
  ```ts
  import { defineConfig } from "blume";

  export default defineConfig({
    title: "web-agents",
    description: "Show people what a WebMCP agent does on their page: a ghost cursor, fields typed in place, a parked confirm state.",
    // The API reference lives at the repo root (docs/), where every API change updates it; this app only renders it.
    content: { root: "../../docs" },
    github: { owner: "mustafaskyer", repo: "web-agents", dir: "docs" },
  });
  ```
  The owner/repo come from `.changeset/config.json` (`mustafaskyer/web-agents`); confirm with
  `git remote get-url origin`. `github.dir` is the path from the repo root to the project root (`apps/docs`): read
  the "GitHub" section and check one "Edit on GitHub" link points at `…/blob/main/docs/core/define-web-tool.md`;
  adjust `dir` until it does.
- **DON'T** set `deployment.site` (auto-detected on Vercel, per `02-deployment.mdx`), `search` (Orama is the default),
  or `agents.mcp` (needs a server build). Leave `theme` default for now unless the user asks for one.
- **GOTCHA**: Biome formats this file (double quotes, trailing commas). Run `pnpm format`.
- **VALIDATE**: `pnpm --filter @web-agents/docs build` → `74 page(s) built` (before the slug task the count is the same; the routes change).

### UPDATE the 8 README files under `docs/` (frontmatter `slug`)

- **IMPLEMENT**: prepend, keeping the existing `# H1` as the first content line after a blank line:
  - `docs/README.md` → `---\nslug: index\n---\n`
  - `docs/<pkg>/README.md` → `---\nslug: <pkg>\n---\n` for `core`, `react`, `polyfill`, `devtools`, `chat`,
    `local-agent`, `vercel-api`.
- **GOTCHA**: `slug` is the full route from the content root, not just the last segment. Don't add `title` (the H1 is
  used: verified `<title>defineWebTool - web-agents</title>`).
- **VALIDATE**: `pnpm --filter @web-agents/docs build && ls apps/docs/dist/index.html apps/docs/dist/core/index.html && ! ls -d apps/docs/dist/README apps/docs/dist/core/README 2>/dev/null`

### CREATE `docs/<pkg>/meta.ts` (7 files)

- **IMPLEMENT** (order = the "Packages" table in `docs/README.md`):
  ```ts
  import { defineMeta } from "blume";

  export default defineMeta({ title: "@web-agents/core", order: 1 });
  ```
  core 1, react 2, polyfill 3, devtools 4, chat 5, local-agent 6, vercel-api 7. Pages inside a group stay
  alphabetical, with the README (`slug`) as the group's own page; don't list `pages` (it would need updating with
  every new API file).
- **GOTCHA**: The repo-root `docs/` is outside every tsconfig, so editors may not resolve `blume` there; the build
  does. Biome lints/formats these files.
- **GOTCHA**: `deploy.md` and the home page sit at the top level; give `deploy.md` frontmatter
  `sidebar: { order: 99 }` only if it sorts above the packages (check the dev server).
- **VALIDATE**: `pnpm --filter @web-agents/docs build && grep -oE '>@web-agents/[a-z-]+<' apps/docs/dist/deploy/index.html | uniq | head -7`
  → core, react, polyfill, devtools, chat, local-agent, vercel-api.

### CREATE `apps/docs/turbo.json`

- **IMPLEMENT**:
  ```json
  {
    "$schema": "https://turborepo.com/schema.json",
    "extends": ["//"],
    "tasks": {
      "build": { "inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/docs/**"], "outputs": ["dist/**"] },
      "test": { "inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/docs/**"] }
    }
  }
  ```
  Also keep `env: ["VERCEL_*"]` out: `globalPassThroughEnv` already passes `VERCEL_*`, which Blume uses to detect the
  site URL.
- **NOTE**: `$TURBO_ROOT$` is documented in the installed Turbo 2.11 (`node_modules/.pnpm/turbo@2.11.10/node_modules/turbo/docs/reference/configuration.mdx`).
- **VALIDATE**: `pnpm turbo run build --filter=@web-agents/docs` twice (second is `FULL TURBO`), then
  `echo >> docs/deploy.md && pnpm turbo run build --filter=@web-agents/docs --dry=json | grep -c '"cache":{"status":"MISS"'`
  → cache miss for the docs build; `git checkout docs/deploy.md` afterwards.

### CREATE `apps/docs/vercel.json`

- **IMPLEMENT**:
  - `$schema`, `"framework": null`, `"buildCommand": "turbo run build"`, `"outputDirectory": "dist"`,
    `"installCommand": "pnpm install --frozen-lockfile"`.
  - `"ignoreCommand": "git diff --quiet HEAD^ HEAD -- . ../../docs ../../pnpm-lock.yaml"` (exit 0 = skip; gotcha 6).
  - `headers`: copy the Markdown/`.txt` content-type entries from the built `apps/docs/dist/vercel.json` (gotcha 5),
    plus the two security headers from `apps/flights/vercel.json`, plus immutable caching for `/_astro/(.*)`
    (Astro's hashed assets; the apps use `/assets/`).
  - No `rewrites` (static multi-page site, not an SPA).
- **VALIDATE**: `node -e "JSON.parse(require('fs').readFileSync('apps/docs/vercel.json','utf8'))" && pnpm exec biome ci apps/docs`

### UPDATE `.changeset/config.json`

- **ADD** `"@web-agents/docs"` to `ignore` (private, never published; matches the other apps).
- **VALIDATE**: `pnpm changeset status` exits without complaining about `@web-agents/docs`.

### CREATE `apps/docs/README.md`

- **IMPLEMENT**: 5-10 lines: what it is (Blume site rendering `../../docs`), `pnpm --filter @web-agents/docs dev`
  (port printed by Blume), `build` → `dist/`, `test` = link check, "edit content in `docs/`, not here", the `slug` /
  `meta.ts` conventions, the satteri override note.
- **VALIDATE**: read it.

### UPDATE `docs/deploy.md`

- **ADD** a final section `## Docs site (apps/docs)`: own Vercel project, Root Directory `apps/docs`, settings from
  `vercel.json`, keep "Include source files outside of the Root Directory in the Build Step" **on** (content is
  `../../docs`), optional `VERCEL_DEEP_CLONE=true` for "last modified" dates, no secrets needed, smoke test:
  ```bash
  D=https://<docs-deployment>
  curl -s -o /dev/null -w "%{http_code}\n" $D/core/define-web-tool          # 200
  curl -sI $D/core/define-web-tool.md | grep -i content-type                 # text/markdown; charset=utf-8
  curl -s $D/llms.txt | head -5
  ```
- **GOTCHA**: this file is itself a docs page now; run `blume validate` after editing.
- **VALIDATE**: `pnpm --filter @web-agents/docs test`

### UPDATE `CLAUDE.md` and `README.md`

- **CLAUDE.md**:
  - Tech Stack: `| Blume 2 (Astro) | docs site (apps/docs) renders docs/ |`.
  - Commands: `pnpm --filter @web-agents/docs dev` and `… test` (link check).
  - Project Structure: `apps/docs/  Blume site; content root is ../../docs (README slugs, docs/<pkg>/meta.ts order)`;
    in the `docs/` line, note the frontmatter `slug` on READMEs and `meta.ts` per package folder.
  - Gotchas: satteri override; `blume build` refuses while `blume dev` runs (so `pnpm check` with `pnpm dev` up fails
    in the docs build); new docs pages stay `.md` (braces in `.mdx` are JSX); new package folder needs README `slug`
    + `meta.ts`; `blume check` is broken, don't use it.
- **README.md** (root): link the docs site (placeholder until deployed) next to the existing `docs/` link.
- **VALIDATE**: `pnpm --filter @web-agents/docs test` (CLAUDE.md is not in the content root; README.md isn't either).

### RUN full validation

- **VALIDATE**: `pnpm check` (with no `pnpm dev` running: gotcha 7) and `pnpm turbo run check-exports` (the docs app
  has no such script: confirm turbo just skips it).

---

## TESTING STRATEGY

No unit tests: the app has no code of its own. Testing is build-level:

### Unit Tests
None (config only). `blume validate` is the regression test for content: every internal link and anchor resolves.

### Integration Tests
- `pnpm --filter @web-agents/docs build`: 74 pages, exit 0, no `BLUME_` errors.
- `pnpm turbo run test --filter=@web-agents/docs` → "No broken links found."
- Turbo cache invalidates on a `docs/` edit (task above).

### Edge Cases
- A link to a README from another package (`../core/README.md`) lands on `/core`, not `/core/README`.
- Anchors into tables/headings (`./tool-error.md#codes`) survive: `blume validate` checks anchors.
- `docs/deploy.md` (not a package page) still builds at `/deploy`.
- Raw Markdown copies: `dist/core/define-web-tool.md` exists and starts with the original content.
- No page leaks the generated `.blume` path or `/README` in `llms.txt`: `grep -c README apps/docs/dist/llms.txt` → 0.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```bash
pnpm exec biome ci .
```

### Level 2: Build + link check
```bash
pnpm --filter @web-agents/docs build
pnpm --filter @web-agents/docs test
pnpm --filter @web-agents/docs exec blume doctor
```

### Level 3: Whole repo
```bash
pnpm check
```

### Level 4: Manual Validation
`pnpm --filter @web-agents/docs dev`, open the printed URL (Playwright's Chromium or the agent-browser skill):
- `/` is "web-agents API docs"; sidebar groups in package order; each group header opens the package README.
- Search (⌘K) "defineWebTool" → `/core/define-web-tool`; "timeout" → tool error codes page.
- Click a cross-package link (react → core) → no 404.
- Open `/core/define-web-tool.md` (raw Markdown) and `/llms.txt`.
- Light/dark toggle, mobile width (Pixel 7): sidebar drawer works.
- "Edit on GitHub" points at `docs/…` on `main`.

### Level 5: Deploy (ask the user first)
`vercel link` in `apps/docs`, `vercel deploy`, run the smoke test from `docs/deploy.md`.

---

## ACCEPTANCE CRITERIA

- [ ] `apps/docs` builds every file in `docs/` (74 pages today) with `blume build`, exit 0.
- [ ] `/` and `/<pkg>` serve the READMEs; no `/README` routes.
- [ ] Sidebar order matches `docs/README.md`'s Packages table.
- [ ] `blume validate` reports no broken links; runs as the app's `test` script in `pnpm check` / CI.
- [ ] Editing anything in `docs/` invalidates the docs build cache.
- [ ] `docs/` still renders correctly on GitHub (only a small frontmatter table added on READMEs).
- [ ] `apps/docs/vercel.json` carries the Markdown content-type headers; deploy steps in `docs/deploy.md`.
- [ ] `.blume/`, `.blume-verify/` git-ignored; `@web-agents/docs` ignored by changesets.
- [ ] CLAUDE.md documents the app and its gotchas.
- [ ] `pnpm check` passes.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] `pnpm check` passes
- [ ] Manual browse of the dev server done (search, sidebar, raw `.md`, `llms.txt`, mobile)
- [ ] Acceptance criteria all met

---

## NOTES

- **Why content stays in `docs/`, not `apps/docs/docs/`:** CLAUDE.md makes `docs/` the place every API change is
  documented, and it is linked from GitHub. Moving it would split the source of truth or break those links. The spike
  proved Blume handles an outside content root, plain `.md`, H1 titles and relative `.md` links.
- **Why static, not `vercel()` server output:** nothing needs a server today. A server build would add `Accept:
  text/markdown` negotiation and an MCP endpoint (`agents.mcp`), a natural follow-up for a WebMCP project, but it
  costs a function per request and a rate limit. Revisit as a separate change.
- **Out of scope:** a custom landing page in MDX, theming/branding (logo, accent), an assistant (`ai.assistant`, needs
  an AI Gateway key), versioning, OpenAPI pages. `docs/README.md` is a good enough home page for v1.
- The spike ran in `/tmp` and was deleted; nothing in the repo changed. Blume 2.2.7 is current `latest` (2026-11-08).
- **Confidence: 8/10.** Both blocking issues (satteri split, README routes) were reproduced and fixed in the spike.
  Remaining risk: the workspace lockfile resolving differently from the spike (more or fewer ignored builds), the
  and the exact `github.dir` value.
