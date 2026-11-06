# Feature: Deploy to Vercel, CI, and npm publishing (Phase 7)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> **Outward-facing actions need explicit user confirmation, every time.** Ask the user before each of these, and
> report the result:
> - `vercel link`, `vercel deploy`, `vercel env add`, and any Vercel dashboard change
> - creating or attaching an Upstash/Marketplace integration
> - adding GitHub secrets, pushing branches, opening PRs
> - `changeset publish` / `npm publish`
>
> Everything else in this plan (files, config, local `vercel build`) can be done without asking. Never print or
> commit secret values.

Read first: `.agents/plans/00-web-agents-roadmap.md` (Deploy row, Risks) and `.agents/plans/05-chat-widget-cloud-agent.md` (`createChatHandler`, the `guard`, the `GET` capability response).

## Feature Description

Ship the three example apps (`apps/playground`, `apps/ecommerce`, `apps/flights`) as public Vercel deployments. Each one has a working `/api/chat`, a Vercel Function backed by `@web-agents/chat/server`, protected against abuse:
- per-IP rate limits
- a daily global budget
- an origin allow-list
- token/step caps
- a graceful "chat offline" state when no key is set

Add CI (Biome, typecheck, unit + browser tests, build, e2e) on GitHub Actions. Add Changesets-driven publishing of the `@web-agents/*` packages to npm with provenance, publint and are-the-types-wrong checks. Update the READMEs with live links and deploy instructions.

## User Story

As the maintainer of `@web-agents`
I want every example app deployed automatically and every package published reproducibly
So that people can try the agent cursor and chat live, and install the packages from npm with correct types

As a visitor of the public demo
I want the chat to work (or clearly say it's offline)
So that I can try it without the maintainer's API key being abused

## Problem Statement

The work is local only today. Vite SPAs on Vercel need history-fallback rewrites that don't swallow `/api`. A monorepo needs per-app projects and skipped builds for unaffected apps. Workspace packages must be built before the function bundler resolves them. A public endpoint holding an Anthropic key is an abuse target. There is no CI gate and no release process for the libraries.

## Solution Statement

**Vercel projects**
- One Vercel project per app, with Root Directory `apps/<name>`, framework Vite, and the build command `turbo run build`. The app filter is inferred from the Root Directory.
- "Skip unaffected projects" is on. A `turbo-ignore` Ignored Build Step is the fallback.

**Per-app `vercel.json`**
- SPA rewrite `/((?!api/).*)` → `/index.html`.
- `functions["api/chat.ts"].maxDuration = 60`.

**`api/chat.ts`**
- Three lines, delegating to a private workspace package `@web-agents/vercel-api`.
- That package composes `createChatHandler` with guards:
  - origin allow-list
  - Upstash sliding-window rate limit, with an in-memory fallback
  - a daily global budget
  - body-size and step caps
- Public demos use `WEB_AGENTS_MODEL=claude-sonnet-5-5`.

**CI and release**
- GitHub Actions `ci.yml`: install, `biome ci`, then turbo typecheck/test/build. Playwright browsers install for Vitest browser mode and e2e.
- `release.yml`: `changesets/action` opens a "Version Packages" PR, and publishes with npm provenance on merge.
- The `check-exports` task runs publint + attw on every library.

## Feature Metadata

**Feature Type**: New Capability (infrastructure)
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- `apps/*/` (`vercel.json`, `api/chat.ts`)
- new `packages/vercel-api`
- `turbo.json`, root `package.json`
- `.github/workflows/`, `.changeset/`
- READMEs

**Dependencies**: `vercel` CLI (latest), `turbo-ignore` 2.11.x, `@upstash/ratelimit` + `@upstash/redis` (verify versions), `@changesets/cli` + `@changesets/changelog-github`, `publint`, `@arethetypeswrong/cli`

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.agents/plans/00-web-agents-roadmap.md`. Why: Deploy decision ("one Vercel project per app, Root Directory `apps/<name>`, `api/chat.ts` web-standard function"), Risks ("A public demo with an Anthropic key needs rate limiting, token caps and an origin check"), and default model notes.
- `packages/chat/src/server/handler.ts` (Phase 5). Why: `ChatHandlerOptions` (`model`, `maxOutputTokens`, `maxSteps`, `guard`, `env`), the `GET` capability response, 503 `chat_disabled`. Guards plug into `guard`.
- `packages/chat/src/server/validate.ts` (Phase 5). Why: the existing structural caps (60 messages, 48 tools, 256 KB body). Don't duplicate them; the guards add rate and origin checks only.
- `packages/chat/src/adapter/cloud.ts` (Phase 5). Why: it maps 429 → `error{code:"rate_limited"}` and 503 → `chat_disabled`. Guard responses must use exactly these statuses and a JSON `{error}` body.
- `packages/chat/src/vite/index.ts` (Phase 5). Why: the dev path uses the same handler. Guards must be no-ops in dev (no Upstash env present).
- `turbo.json` (Phase 1). Why: add `env` and `check-exports` tasks without breaking existing `dependsOn`/`outputs`.
- `package.json` (root, Phase 1). Why: scripts (`build`, `typecheck`, `test`, `lint`) the CI calls, and the `packageManager` field (pnpm 11) used by `pnpm/action-setup`.
- `packages/*/package.json` (Phases 1-6). Why: every publishable package needs:
  - `publishConfig`, `files`, `exports`, `license`, `repository`
  - the `"@web-agents/source"` export condition, which must remain harmless for consumers since it points at `src/`, which is not in `files`. See GOTCHA in Task 9.
- `apps/*/vite.config.ts` (Phases 1-6). Why: `resolve.conditions` includes `@web-agents/source`. This is fine for the Vite build. Vercel's function bundler (nft) resolves the **default** conditions, so `dist/` must exist; `turbo build` `^build` guarantees it.
- `README.md` (root). Why: currently documents only the single-app demo. Rewrite the top sections for the monorepo.

### New Files to Create

```
apps/playground/vercel.json
apps/playground/api/chat.ts
apps/ecommerce/vercel.json            (if Phase 4 done)
apps/ecommerce/api/chat.ts
apps/flights/vercel.json
apps/flights/api/chat.ts
packages/vercel-api/package.json      private: true, name "@web-agents/vercel-api"
packages/vercel-api/tsconfig.json
packages/vercel-api/src/index.ts      createVercelChatRoute()
packages/vercel-api/src/guards.ts     originGuard, rateLimitGuard, budgetGuard, composeGuards
packages/vercel-api/src/limiter.ts    Upstash limiter + in-memory fallback
packages/vercel-api/test/guards.test.ts
.github/workflows/ci.yml
.github/workflows/release.yml
.changeset/config.json
.changeset/README.md
docs/deploy.md                        step-by-step Vercel setup (dashboard + CLI), env var table
```

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

**Vercel**
- [Vercel + Turborepo](https://vercel.com/docs/monorepos/turborepo#import-your-turborepo-to-vercel). Why: per-app projects, Root Directory, inferred `turbo build` filter, remote cache.
- [Skipping unaffected projects](https://vercel.com/docs/monorepos#skipping-unaffected-projects) and [Ignored Build Step](https://vercel.com/docs/project-configuration/git-settings#ignored-build-step). Why: avoid rebuilding all 3 apps on every push; `npx turbo-ignore --fallback=HEAD^1`.
- [Vite on Vercel: SPA rewrites](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas) and [env vars](https://vercel.com/docs/frameworks/frontend/vite#environment-variables). Why: the rewrite, and that only `VITE_*` vars reach the client.
- [Node.js runtime: create a function in /api](https://vercel.com/docs/functions/runtimes/node-js#create-a-node-js-function-in-api) and [Functions API reference: Web handlers (named HTTP method exports)](https://vercel.com/docs/functions/functions-api-reference). Why: `export function GET/POST(request: Request)` in a non-framework project, plus `maxDuration`, and streaming responses.
- [vercel.json reference](https://vercel.com/docs/project-configuration). Why: `rewrites`, `functions`, `headers`, `$schema`.
- [Vercel CLI: link](https://vercel.com/docs/cli/link), [deploy](https://vercel.com/docs/cli/deploy), [env](https://vercel.com/docs/cli/env), [build](https://vercel.com/docs/cli/build). Why: `vercel link --repo`, `vercel env add`, `vercel build` + `vercel deploy --prebuilt`.
- [Upstash Redis on the Vercel Marketplace](https://vercel.com/marketplace/upstash). Why: which env var names the integration injects (`KV_REST_API_URL`/`KV_REST_API_TOKEN` vs `UPSTASH_REDIS_REST_URL`/`_TOKEN`). **Verify before coding.**

**Turborepo, rate limiting, CI, publishing**
- [Turborepo: environment variables](https://turborepo.com/docs/crafting-your-repository/using-environment-variables). Why: `env` / `passThroughEnv` / `globalEnv`, strict env mode on Vercel.
- [Upstash Ratelimit (TS)](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) and [algorithms: slidingWindow](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms#sliding-window). Why: `new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "1 m"), prefix })`, `limit(id)` → `{ success, reset, remaining }`.
- [pnpm: GitHub Actions](https://pnpm.io/continuous-integration#github-actions). Why: `pnpm/action-setup` + `actions/setup-node` cache.
- [Changesets intro](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md), [changesets/action](https://github.com/changesets/action#with-publishing), [ignore private packages](https://github.com/changesets/changesets/blob/main/docs/config-file-options.md#ignore-array-of-packages). Why: the release flow.
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements#publishing-packages-with-provenance-via-github-actions). Why: `id-token: write`, `NPM_CONFIG_PROVENANCE=true`.
- [publint](https://publint.dev/docs/) and [are-the-types-wrong CLI](https://github.com/arethetypeswrong/arethetypeswrong.github.io/tree/main/packages/cli#readme). Why: `attw --pack . --profile esm-only` for ESM-only packages.
- [Playwright in CI](https://playwright.dev/docs/ci-intro#setting-up-github-actions). Why: `playwright install --with-deps chromium`.

### Patterns to Follow

**Chat handler composition.** `api/chat.ts` stays tiny; all logic lives in a tested package:
```ts
// apps/<app>/api/chat.ts
import { createVercelChatRoute } from "@web-agents/vercel-api";
export const { GET, POST, OPTIONS } = createVercelChatRoute({ app: "playground" });
```

**Guard contract** (from the Phase 5 `ChatHandlerOptions.guard`): return a `Response` to short-circuit, or `undefined` to continue:
```ts
guard?: (req: Request) => Promise<Response | undefined> | Response | undefined;
```

**Error body shape** the cloud adapter already understands (Phase 5 `cloud.ts` status mapping):
```ts
new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { "content-type": "application/json", "retry-after": String(seconds) } })
```

**Package scripts.** Mirror the existing ones in `packages/core/package.json` (Phase 1): `build: tsdown`, `typecheck: tsc --noEmit`, `test: vitest run`.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

- `@web-agents/vercel-api` package: guards, limiter, route factory, with tests.
- `turbo.json` env declarations, and a `check-exports` task.

### Phase 2: Core Implementation

- Per-app `vercel.json` + `api/chat.ts`.
- Local verification with `vercel build` (no deploy).

### Phase 3: Integration

- GitHub Actions CI + release workflows. Changesets config.
- Package metadata for publishing. READMEs and `docs/deploy.md`.
- **With user confirmation:**
  - link the projects
  - add env vars and the Upstash integration
  - preview deploy
  - production deploy
  - add the npm token secret

### Phase 4: Testing & Validation

- Unit tests for guards. CI green on a PR.
- Smoke tests against preview URLs (curl + `agent-browser`). `security-review`.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 1. CREATE `packages/vercel-api` scaffold

- **IMPLEMENT**:
  - `package.json`:
    ```json
    {
      "name": "@web-agents/vercel-api",
      "private": true,
      "type": "module",
      "exports": { ".": { "@web-agents/source": "./src/index.ts", "types": "./dist/index.d.mts", "import": "./dist/index.mjs" } },
      "scripts": { "build": "tsdown", "typecheck": "tsc --noEmit", "test": "vitest run" },
      "dependencies": { "@web-agents/chat": "workspace:*", "@ai-sdk/anthropic": "^4.0.97", "@upstash/ratelimit": "<verify>", "@upstash/redis": "<verify>" }
    }
    ```
  - `tsdown.config.ts`: `platform: "node"`, `external: [/^@web-agents\//, /^@ai-sdk\//, /^@upstash\//]`.
- **PATTERN**: `packages/chat/package.json` (Phase 5)
- **GOTCHA**:
  - Run `npm view @upstash/ratelimit version` and `npm view @upstash/redis version`.
  - This package is `private`. Add it to the Changesets `ignore` list in Task 9.
- **VALIDATE**: `pnpm install && pnpm --filter @web-agents/vercel-api typecheck`

### 2. CREATE `packages/vercel-api/src/limiter.ts`

- **IMPLEMENT**: `createLimiter({ env, prefix, limit, window }): Limiter` with `limit(key): Promise<{ success: boolean; reset: number; remaining: number }>`.
  - **Upstash** when the REST URL and token are present. Accept both env name pairs: `KV_REST_API_URL`/`KV_REST_API_TOKEN` and `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`. Construct with `new Redis({ url, token })`; don't use `fromEnv`, so both pairs work. Use `Ratelimit.slidingWindow(limit, window)`, `analytics: false`, `prefix: \`web-agents:${prefix}\``.
  - **Otherwise** an in-memory sliding window (`Map<string, number[]>`, pruned per call, max 10k keys with LRU-ish eviction). Log a one-time warning: "Rate limiting is per-instance. Add Upstash Redis for global limits."
- **GOTCHA**:
  - Upstash calls add latency. Use the limiter's `timeout` option (e.g. 1000 ms) so a Redis outage **fails open** for the per-IP limit but **fails closed** for the global budget.
  - Document that choice in a comment.
- **VALIDATE**: `pnpm --filter @web-agents/vercel-api test -- guards`

### 3. CREATE `packages/vercel-api/src/guards.ts`

- **IMPLEMENT**:
  - `originGuard({ allowed: string[]; patterns?: RegExp[] })`:
    - For POST, require an `Origin` header that matches exactly one of `allowed`, or a pattern. Otherwise return 403 `{error:"forbidden_origin"}`.
    - Default patterns allow this project's preview URLs, built from `VERCEL_PROJECT_PRODUCTION_URL` and `VERCEL_URL`, plus `https://<project>-*-<team>.vercel.app` when `VERCEL_GIT_REPO_OWNER` is set. Verify the system env var names in the Vercel docs.
    - `http://localhost:*` is allowed only when `VERCEL_ENV` is unset (dev).
  - `rateLimitGuard(limiter)`:
    - The key is the client IP from `x-forwarded-for` (first entry) or `x-real-ip`, else `"anon"`.
    - On `!success`, return 429 `{error:"rate_limited"}` with `retry-after`.
    - Two limiters: burst `10 / 1 m` and daily `150 / 1 d` per IP.
  - `budgetGuard(limiter)`: a global key `"global"`, `RATE_LIMIT_GLOBAL_DAILY` (default 3000) requests per day. Exceeding it returns 503 `{error:"chat_disabled", reason:"daily_budget"}`, which the widget shows as offline.
  - `composeGuards(...guards)` runs them in order and returns the first `Response`.
  - All limits come from env, with defaults:

    | Env var | Default |
    |---|---|
    | `RATE_LIMIT_PER_MINUTE` | 10 |
    | `RATE_LIMIT_PER_DAY` | 150 |
    | `RATE_LIMIT_GLOBAL_DAILY` | 3000 |
    | `ALLOWED_ORIGINS` | (comma list) |

- **GOTCHA**:
  - Count only `POST`. `GET` (capability) and `OPTIONS` are never limited.
  - Each tool round-trip is a POST, so one user message can cost several requests. The 10/min burst must allow a 4–5 step turn. Document this next to the defaults.
- **VALIDATE**: `pnpm --filter @web-agents/vercel-api test -- guards`

### 4. CREATE `packages/vercel-api/src/index.ts`: `createVercelChatRoute`

- **IMPLEMENT**:
  ```ts
  export interface VercelChatRouteOptions { app: string; env?: Record<string, string | undefined> }
  export function createVercelChatRoute({ app, env = process.env }: VercelChatRouteOptions) {
    const handler = createChatHandler({
      env,
      model: env.WEB_AGENTS_MODEL ?? "claude-sonnet-5-5",   // public demos default to the cheaper model
      maxOutputTokens: Number(env.WEB_AGENTS_MAX_OUTPUT_TOKENS ?? 800),
      maxSteps: Number(env.WEB_AGENTS_MAX_STEPS ?? 6),
      guard: composeGuards(originGuard(...), rateLimitGuard(...), budgetGuard(...)),
    });
    return { GET: handler, POST: handler, OPTIONS: handler };
  }
  ```
- **GOTCHA**:
  - When `ANTHROPIC_API_KEY` is missing, `GET` returns `{enabled:false}` (Phase 5 behaviour) and the widget shows offline. Guards still run for POST, and the handler returns 503. Nothing crashes at import time.
  - Do not read env at module top level outside the factory call. Vercel injects env at runtime, but tests pass `env` explicitly.
- **VALIDATE**: `pnpm --filter @web-agents/vercel-api test && pnpm --filter @web-agents/vercel-api build`

### 5. UPDATE `turbo.json`

- **IMPLEMENT**:
  - `build.env`: `["VITE_*"]`, so client-visible vars bust the app cache.
  - Server-only vars must not affect build hashes. Add `globalPassThroughEnv` for `ANTHROPIC_API_KEY`, `WEB_AGENTS_*`, `RATE_LIMIT_*`, `ALLOWED_ORIGINS`, `KV_REST_API_*`, `UPSTASH_REDIS_REST_*`, `VERCEL_*`, so strict env mode doesn't strip them in `vercel build`. Verify against the Turborepo env docs.
  - New task: `"check-exports": { "dependsOn": ["build"], "outputs": [] }`.
  - New task: `"e2e": { "dependsOn": ["^build"], "cache": false }`, if Phase 4 added it. Keep it.
- **PATTERN**: the existing `turbo.json` tasks (Phase 1)
- **VALIDATE**: `pnpm turbo run build --dry=json | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))" && echo ok`

### 6. CREATE per-app `vercel.json` (playground, ecommerce, flights)

- **IMPLEMENT**:
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "vite",
    "buildCommand": "turbo run build",
    "outputDirectory": "dist",
    "installCommand": "pnpm install --frozen-lockfile",
    "ignoreCommand": "npx turbo-ignore --fallback=HEAD^1",
    "rewrites": [{ "source": "/((?!api/|assets/).*)", "destination": "/index.html" }],
    "functions": { "api/chat.ts": { "maxDuration": 60 } },
    "headers": [
      { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
      { "source": "/(.*)", "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" } ] }
    ]
  }
  ```
- **GOTCHA**:
  - If the local-agent (Phase 6) WASM multithreading is enabled, COOP/COEP headers would be needed. **Don't add them by default**: they break third-party embeds. Note it in `docs/deploy.md`.
  - `ignoreCommand` conflicts with the dashboard "Skip unaffected projects" setting in no way, but only one is needed. Keep `ignoreCommand` because it lives in code.
- **VALIDATE**: `for a in playground ecommerce flights; do test -f apps/$a/vercel.json && node -e "JSON.parse(require('fs').readFileSync('apps/$a/vercel.json','utf8'))"; done`

### 7. CREATE per-app `api/chat.ts`

- **IMPLEMENT**: the 3-line file from Patterns, with `app` set to the app name. Add `"@web-agents/vercel-api": "workspace:*"` to each app's `dependencies`.
  - Exclude `api/` from the app's Vite tsconfig `include`, or give `api/` its own `tsconfig.json` with `types: ["node"]`, so the browser typecheck doesn't pull Node types.
  - The app `typecheck` script must cover both.
- **GOTCHA**:
  - Vercel bundles `api/*.ts` with its own TS compile (nft + esbuild/swc) using **default** export conditions. That resolves `@web-agents/vercel-api` → `dist/index.mjs`, which exists because `turbo run build` builds `^` deps first.
  - Confirm with `vercel build` (Task 8) that the function bundle includes `@web-agents/chat/dist/server`.
  - AI SDK v7 requires **Node 22+**. Set the project Node version to 24.x (dashboard or `engines.node: ">=22"` in each app's package.json).
- **VALIDATE**: `pnpm turbo run typecheck --filter=./apps/*`

### 8. VERIFY locally with `vercel build` (no deploy)

- **IMPLEMENT**:
  - **Ask the user first** whether to run `vercel link` for each app. Link writes `.vercel/` (gitignored), but it does create or attach a Vercel project. If they decline, skip to Task 9 and do only the Level 3 checks.
  - With approval, per app:
    ```bash
    cd apps/<app> && vercel link --yes
    vercel pull --yes --environment=preview
    vercel build
    ```
  - Inspect `.vercel/output/functions/api/chat.func/` for a bundled handler, and confirm `.vercel/output/static/index.html` exists.
- **GOTCHA**: `.vercel/` must be in `.gitignore`. Add it if missing.
- **VALIDATE**: `ls apps/playground/.vercel/output/functions/api/chat.func && ls apps/playground/.vercel/output/static/index.html`

### 9. CREATE Changesets config + package publish metadata

- **IMPLEMENT**:
  - `pnpm add -Dw @changesets/cli @changesets/changelog-github publint @arethetypeswrong/cli`, then `pnpm changeset init`.
  - `.changeset/config.json`:
    - `"changelog": ["@changesets/changelog-github", { "repo": "<owner>/<repo>" }]` (read it from `git remote get-url origin`)
    - `"access": "public"`
    - `"baseBranch": "main"`
    - `"ignore": ["playground", "ecommerce", "flights", "@web-agents/vercel-api"]` (use the actual app package names)
    - `"fixed": [["@web-agents/*"]]` for lock-step 0.x versions. Optional; pick fixed for simplicity.
  - Every publishable `packages/*/package.json` gets:
    - `"license": "MIT"` (**ask the user** to confirm the license)
    - `"repository": { "type": "git", "url": "...", "directory": "packages/<name>" }`
    - `"publishConfig": { "access": "public", "provenance": true }`
    - `"files": ["dist", "README.md"]`
    - script `"check-exports": "publint && attw --pack . --profile esm-only"`
  - Add the first changeset: `minor` for all public packages, "Initial release".
- **GOTCHA**:
  - The `"@web-agents/source": "./src/index.ts"` export condition points outside `files`. publint may warn. That's acceptable, because the condition is custom and only matches when a consumer opts in. If publint errors, strip the condition at publish time with a `prepack` script that rewrites `exports` (keep a `scripts/strip-source-condition.mjs`). Prefer the publint suppression if available.
  - The `.css` exports need `"default"` only (no `types`).
- **VALIDATE**: `pnpm turbo run check-exports --filter='./packages/*'`

### 10. CREATE `.github/workflows/ci.yml`

- **IMPLEMENT**:
  ```yaml
  name: CI
  on: { push: { branches: [main] }, pull_request: {} }
  concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
  jobs:
    checks:
      runs-on: ubuntu-latest
      env: { TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}, TURBO_TEAM: ${{ vars.TURBO_TEAM }} }
      steps:
        - uses: actions/checkout@v4
          with: { fetch-depth: 2 }
        - uses: pnpm/action-setup@v4           # reads packageManager from package.json
        - uses: actions/setup-node@v4
          with: { node-version: 24, cache: pnpm }
        - run: pnpm install --frozen-lockfile
        - run: pnpm exec biome ci .
        - run: pnpm exec playwright install --with-deps chromium
        - run: pnpm turbo run typecheck test build check-exports
    e2e:
      needs: checks
      runs-on: ubuntu-latest
      steps:
        - (same setup steps)
        - run: pnpm exec playwright install --with-deps chromium
        - run: pnpm turbo run e2e
        - uses: actions/upload-artifact@v4
          if: failure()
          with: { name: playwright-report, path: "apps/*/playwright-report" }
  ```
  Verify the current major versions of the actions (`actions/checkout`, `setup-node`, `pnpm/action-setup`, `upload-artifact`) at implementation time.
- **GOTCHA**:
  - Vitest browser mode needs the Playwright chromium binary, so install it before `turbo test`.
  - Turbo remote cache is optional. Without the secrets, the env vars are empty and turbo runs uncached. Don't fail the job.
  - Don't run the gated local-model e2e (`E2E_LOCAL_MODEL`) in CI.
- **VALIDATE**: `npx --yes @action-validator/cli .github/workflows/ci.yml` (or `actionlint` if installed)

### 11. CREATE `.github/workflows/release.yml`

- **IMPLEMENT**:
  - On `push` to `main`, with `permissions: { contents: write, pull-requests: write, id-token: write }`.
  - Steps: setup (same as CI), `pnpm turbo run build check-exports --filter='./packages/*'`, then `changesets/action@v1` with:
    - `publish: pnpm changeset publish`
    - `version: pnpm changeset version`
    - `commit: "chore: version packages"`
    - `title: "chore: version packages"`
  - Env: `GITHUB_TOKEN`, `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}`, `NPM_CONFIG_PROVENANCE: true`.
  - Add a `.npmrc` step writing `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`.
- **GOTCHA**: publishing is outward-facing. Adding `NPM_TOKEN` (or npm trusted publishing) and claiming the `@web-agents` npm scope must be done by the user. **Ask** and give them the exact steps. Check scope availability with `npm view @web-agents/core` (expect 404 / not found). If the scope is taken, stop and ask for an alternative.
- **VALIDATE**: `npx --yes @action-validator/cli .github/workflows/release.yml`

### 12. UPDATE READMEs + CREATE `docs/deploy.md`

- **IMPLEMENT**:
  - Root `README.md`:
    - project pitch
    - packages table (name, what it does, npm badge)
    - live demo links (placeholders until Task 13)
    - quick start (`pnpm i && pnpm dev`)
    - "Deploy your own" pointing to `docs/deploy.md`
  - Keep the existing cursor/visuals explanation, but move it to `packages/core/README.md` if Phase 1 didn't already.
  - `docs/deploy.md`:
    - create the 3 Vercel projects (Root Directory, Node 24, framework Vite)
    - Upstash Marketplace integration
    - env var table:

      | Var | Scope | Required | Default | Purpose |
      |---|---|---|---|---|
      | `ANTHROPIC_API_KEY` | server | for chat | — | enables `/api/chat` |
      | `WEB_AGENTS_MODEL` | server | no | `claude-sonnet-5-5` | model id |
      | `WEB_AGENTS_MAX_OUTPUT_TOKENS` | server | no | 800 | |
      | `WEB_AGENTS_MAX_STEPS` | server | no | 6 | |
      | `ALLOWED_ORIGINS` | server | prod | — | comma list of origins |
      | `RATE_LIMIT_PER_MINUTE` / `_PER_DAY` / `_GLOBAL_DAILY` | server | no | 10 / 150 / 3000 | |
      | `KV_REST_API_URL` / `KV_REST_API_TOKEN` | server | recommended | — | set by Upstash integration |

    - CLI equivalents (`vercel env add ANTHROPIC_API_KEY production`)
    - how to rotate the key
- **VALIDATE**: `grep -q "docs/deploy.md" README.md && test -f docs/deploy.md`

### 13. DEPLOY (only with explicit user confirmation at each step)

- **IMPLEMENT**:
  - (a) Ask: "Link and create 3 Vercel projects under which team/scope?" Then `vercel link` per app (if not done in Task 8).
  - (b) Ask before adding env vars. Use `vercel env add <NAME> preview` / `production` interactively **without** echoing values. Prefer having the user paste the key into the CLI prompt themselves, or use the Vercel dashboard. Never put the key in the conversation.
  - (c) Ask before attaching Upstash.
  - (d) Preview deploy: `vercel deploy` per app. Report the preview URLs.
  - (e) Run the Level 4 smoke tests on the previews.
  - (f) Ask before `vercel deploy --prod`. Report the production URLs and update the README links in a follow-up commit.
  - (g) Ask before connecting the Git repo for automatic deploys (dashboard → Git).
- **GOTCHA**: if the user wants Vercel AI Gateway instead of a raw Anthropic key, the model becomes `anthropic/claude-sonnet-5-5` with `AI_GATEWAY_API_KEY`. That's a one-line change in `createVercelChatRoute`; don't do it unless asked.
- **VALIDATE**: `curl -s https://<preview>/api/chat` returns `{"enabled":true,...}`

---

## TESTING STRATEGY

### Unit Tests

`packages/vercel-api/test/guards.test.ts` (Vitest, node):
- `originGuard`:
  - allowed origin passes
  - missing origin on POST returns 403
  - a preview-pattern match passes
  - `GET` without origin passes
  - localhost passes only when `VERCEL_ENV` is unset
- `rateLimitGuard` with the in-memory limiter:
  - the 11th POST within a minute from the same IP returns 429 with `retry-after`
  - a different IP is unaffected
  - `GET` is never counted
  - IP parsing handles a multi-entry `x-forwarded-for`
- `budgetGuard`: after N global requests it returns 503 `chat_disabled`.
- Upstash limiter: injected fake `Ratelimit` (dependency injection via an optional constructor param).
  - timeout makes the per-IP limit fail open
  - timeout makes the global budget fail closed
- `createVercelChatRoute` with `env` lacking a key: `GET` → `{enabled:false}`; `POST` from an allowed origin → 503.

### Integration Tests

- CI itself (Task 10) on a PR from this branch is the integration test of the pipeline. All jobs must be green.
- `vercel build` output inspection (Task 8).
- Post-deploy smoke tests (Level 4).

### Edge Cases

- A deep link (`/product/ocean-bloom`, `/flights/booking`) on a fresh load returns `index.html` (200), not a 404.
- `/api/chat` is not rewritten to `index.html`.
- `/assets/*.js` gets the immutable cache header. `index.html` is not cached immutably.
- Key missing in preview: the widget shows offline, and the rest of the app works.
- Streaming through the Vercel function: the response isn't buffered; text appears progressively.
- A long multi-step turn near `maxDuration` 60 s: each step is a separate request, so it is unaffected.
- Upstash down: per-IP fails open, the global budget fails closed (offline message), and there are no 500s.
- A fork PR in CI has no secrets: the jobs still pass (no remote cache, no deploy).

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm exec biome ci .
pnpm turbo run typecheck
for f in apps/*/vercel.json .changeset/config.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || exit 1; done
```

### Level 2: Unit Tests

```bash
pnpm --filter @web-agents/vercel-api test
pnpm turbo run test
```

### Level 3: Integration Tests

```bash
pnpm turbo run build check-exports
pnpm changeset status
! grep -rq "sk-ant-\|ANTHROPIC_API_KEY" apps/*/dist        # no secrets in client bundles
# with user-approved vercel link:
(cd apps/playground && vercel build) && ls apps/playground/.vercel/output/functions/api/chat.func
```

### Level 4: Manual Validation (against preview URLs, after user-approved deploy)

```bash
P=https://<playground-preview-url>
curl -s $P/api/chat                                              # {"enabled":true,"model":"claude-sonnet-5-5"}
curl -s -o /dev/null -w "%{http_code}\n" $P/some/deep/link        # 200 (SPA rewrite)
curl -s -o /dev/null -w "%{http_code}\n" -XPOST $P/api/chat -H 'origin: https://evil.example' -H 'content-type: application/json' -d '{}'   # 403
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code} " -XPOST $P/api/chat -H "origin: $P" -H 'content-type: application/json' -d '{"messages":[],"tools":[]}'; done; echo   # ends with 429s
curl -sI $P/assets/$(curl -s $P | grep -o 'assets/[^"]*\.js' | head -1 | cut -d/ -f2) | grep -i cache-control   # immutable
```

Then use the `agent-browser` skill on each preview:
- open the chat and run one tool-using message
- confirm the ghost cursor and the cards
- screenshot to `/tmp/phase7/<app>.png`

### Level 5: Additional Validation (Optional)

- Run the `security-review` skill on the branch (focus: `packages/vercel-api`, `api/*.ts`, workflows: secret handling, `pull_request_target` absence, token permissions).
- Run the `e2e-test` skill against the production URLs.
- Check Vercel function logs (`vercel logs <url>`) for errors after the smoke run.

---

## ACCEPTANCE CRITERIA

- [ ] The playground, ecommerce and flights apps are each deployed as a separate Vercel project, with deep links working (SPA rewrite) and `/api/chat` served by a function
- [ ] The chat works on the previews with the key set, and shows offline gracefully without it
- [ ] Origin allow-list, per-IP burst + daily limits, and the global daily budget are enforced (verified by the smoke tests); limits are configurable by env
- [ ] No secrets in client bundles or the repo; `.vercel/` and `.env*.local` are gitignored
- [ ] Unaffected apps skip builds (`turbo-ignore`)
- [ ] CI runs `biome ci`, typecheck, unit + browser tests, build, check-exports and e2e on every PR, and is green
- [ ] Changesets release workflow is configured; `pnpm changeset status` works; publint + attw pass for every public package
- [ ] README and `docs/deploy.md` are updated with live links and the env var table
- [ ] Every outward-facing step was confirmed with the user before running

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms the feature works
- [ ] Acceptance criteria all met
- [ ] `/code-review`, `security-review`, `/commit` done (commits: vercel-api pkg → app configs → CI → changesets → docs)

---

## NOTES

- **Why Upstash over Vercel KV / Edge Config.** Vercel KV was sunset in favour of Marketplace Redis (Upstash). Edge Config is read-optimized and unsuitable for counters. `@upstash/ratelimit` gives a correct sliding window over REST, which suits serverless. The in-memory fallback keeps local dev and unconfigured previews working.
- **Why a private `@web-agents/vercel-api` package.** Three apps share identical route logic, and it needs tests. `api/chat.ts` stays a 3-line, zero-logic file. It's private, so it doesn't pollute the public API. Users deploying their own app copy the pattern or call `createChatHandler` with their own `guard`.
- **Model for public demos.** `claude-sonnet-5-5` (cheaper and faster), overridable. Local dev keeps the Phase 5 default `claude-opus-5-5`.
- **Abuse realities.** Origin checks are trivially spoofed by non-browser clients. The real protection is the per-IP and global limits plus token/step caps. Say this in `docs/deploy.md`.
- **Confidence: 7/10** for one-pass success. Risks:
  - Vercel function bundling of workspace packages with custom export conditions; verified by `vercel build` in Task 8
  - exact Upstash/Vercel system env var names
  - publint's view of the `@web-agents/source` condition

  The remaining steps are gated on user confirmation by design, so "one pass" means everything up to the confirmation prompts.
