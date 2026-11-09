# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`web-agents` is a pnpm + Turborepo monorepo of `@webmcp-agents/*` packages for [WebMCP](https://developer.chrome.com/docs/ai/webmcp)
pages (`document.modelContext`). The core idea: make an agent's tool calls **visible** to the person using the page
(ghost cursor, field replay, a parked "confirm" state) without the tools knowing the visual layer exists, and never
compete with the user (the cursor yields the moment they interact). Roadmap and per-phase implementation plans live in
`.agents/plans/` (`00-web-agents-roadmap.md` is the source of truth for package names, public contracts and versions).

---

## Tech Stack

| Technology | Purpose |
|---|---|
| TypeScript ~6.0 (not 7: tooling) | everything, `strict`, `verbatimModuleSyntax` |
| pnpm 11 workspaces + Turborepo 2 | monorepo, task graph (`build`, `dev`, `typecheck`, `test`) |
| tsdown | library builds (`dist/*.js` + `.d.ts`, ESM only), runs publint |
| Vite 8 + React 19 | apps (`apps/*`); packages declare React as a peer when they need it |
| Vitest 5 (node + browser mode via Playwright/Chromium) | tests |
| Biome 2 | lint + format (Markdown excluded) |
| Blume 2 (Astro) | docs site (`apps/docs`), renders `docs/` |

---

## Commands

```bash
pnpm install
pnpm dev                                   # every app with HMR into package source: playground :5173, ecommerce :5174, flights :5175,
                                           # nextjs :5176, the website (landing + docs) :4321
pnpm check                                 # biome ci + typecheck + test + build + size (what CI runs)
pnpm --filter @webmcp-agents/core size        # core bundle budget (min+gz): visuals-only ≤ 9.25 KB, whole package ≤ 13 KB
pnpm typecheck | pnpm test | pnpm build    # via turbo
pnpm lint / pnpm format                    # biome
pnpm turbo run check-exports               # publint + are-the-types-wrong on every package (CI runs it)
pnpm changeset                             # describe a change to a published package (release.yml publishes)
pnpm e2e                                   # Playwright e2e of apps/ecommerce, apps/flights and apps/nextjs (not part of pnpm check)
pnpm registry:build                        # shadcn build → apps/docs/public/r/*.json (part of pnpm check, with registry:typecheck + registry:test)
pnpm capture                               # docs/media/**: stills + clips of the four apps via Playwright's Chromium + ffmpeg (not in pnpm check)
pnpm --filter @webmcp-agents/core test        # one package
pnpm --filter @webmcp-agents/docs dev         # the website on :4321 (landing at /, docs under /docs; also started by pnpm dev);
                                           # `test` = blume validate (links), `typecheck` = tsc over the landing's components
pnpm --filter @webmcp-agents/core exec vitest run --project core:unit      # node tests only
pnpm --filter @webmcp-agents/core exec vitest run --project core:browser   # Chromium tests only
pnpm exec playwright install chromium      # once, for browser-mode tests
```

---

## Project Structure

```
apps/playground/        demo storefront; every action is a WebMCP tool (declarative forms + imperative)
apps/ecommerce/         "Field Store" example (React Router 7): global / route / drawer-scoped tools, confirm-gated checkout;
                        data/ (mock JSON + pure queries), store/ (cart, cartRules), tools/, e2e/ (Playwright)
apps/flights/           "Skyline" example: search in the URL, results tools on the results route, confirm-gated booking
apps/nextjs/            "Field Store on Next.js" (App Router + shadcn/ui, port 5176): Server Components render pages, client
                        components hold the tools, the chat is the registry's agent-chat block, lib/env.server.ts taints the key.
                        Consumes the packages' dist (predev builds them); public/web-agents/cursor.css is copied, not imported.
apps/docs/              @webmcp-agents/docs (private, port 4321): the one website, a Blume site. The docs are ../../docs, mounted
                        under /docs (`basePath`; edit content in docs/). The home page is the landing: pages/index.astro (its own
                        document, not Blume's PageLayout) hydrates components/landing/landing.tsx as one React island, styled by
                        landing.css (a second Tailwind entry: shadcn tokens). Sections are OpenDesigns blocks
                        (components/opendesigns/**, installed from the user's hub with `shadcn add @opendesigns/<block>`; the hub
                        needs OPENDESIGNS_TOKEN in the env, see components.json) over components/ui (shadcn, React Aria).
                        pages/demos.astro (/demos) hydrates components/landing/demos.tsx the same way: the recorded clips
                        (demos-data.ts) in browser frames; pages/docs/demos.astro redirects the docs header's Demos link.
                        components/landing/: site-tools.ts (the site's own defineWebTool tools: homeTools, demosTools),
                        docs-search.tsx (search_docs, the one declarative form), agent-layer.tsx (polyfill + provider + the
                        first-visit intro, a real show_tools call), try-it.tsx (the hero's grouped chips that run the tools),
                        site-chrome.tsx (the header and footer both pages share), demo-frame.tsx, outline.ts, steps.tsx,
                        faq-data.ts. Consumes the packages' dist (predev builds them). scripts/record-demo.sh <demo>
                        re-records public/demo (agent-browser); theme.css gives the docs the landing's dark palette;
                        public/r/ is the built shadcn registry (gitignored)
registry/               the @webmcp-agents shadcn registry: registry.json + default/<item>/<item>.tsx (agent-chat, agent-tool,
                        agent-subagent, agent-reasoning, agent-model-selector); copies live in apps/nextjs/components/web-agents
                        and must stay identical (registry/test checks it)
packages/core/          @webmcp-agents/core: visuals (cursor.ts, motion.ts, visuals.ts), events.ts, user-yield.ts,
                        webmcp.ts (global WebMCP types), cursor.css (shipped as @webmcp-agents/core/cursor.css),
                        web-tool.ts (defineWebTool), registry.ts, confirm.ts, deferred.ts (deferred release + call tracking)
packages/react/         @webmcp-agents/react: <WebAgentsProvider>, useWebTool, useEnableTools, useToolAnswer, JSX attr types
packages/polyfill/      @webmcp-agents/polyfill: document.modelContext polyfill + declarative forms (+ /auto entry)
packages/chat/         @webmcp-agents/chat: <AgentChat> (components/), AgentAdapter types, agent.ts (defineWebAgent: instructions,
                        tool subsets, sub-agents; /agent entry, isomorphic), createCloudAdapter (adapter/cloud.ts: the model ↔ tool loop,
                        adapter/wire.ts: AI SDK UI message stream), session/ (reducer + useAgentSession, nested delegate runs),
                        /server (createChatHandler on an AI SDK ToolLoopAgent: server/web-agent.ts; server/models.ts resolves
                        "<provider>/<model>" ids), /vite (webAgentsChatDev), chat.css
packages/local-agent/   @webmcp-agents/local-agent: createLocalAdapter (index.ts), loop.ts (shared on-device agent loop),
                        tool-call-parser.ts, tools.ts (rank/compact/validate), providers/transformers (worker + engine +
                        main-thread provider), providers/prompt-api (Chrome LanguageModel)
packages/vercel-api/    @webmcp-agents/vercel-api (private): createVercelChatRoute for apps/*/api/chat.ts — origin, per-IP
                        rate limit (Upstash or in-memory) and daily budget guards around the chat handler
packages/devtools/      @webmcp-agents/devtools: store.ts (tools, calls, settings), schema-form/ (JSON-Schema form), ui/ (React
                        panel in a shadow root), vanilla.tsx (installWebAgentsDevtools), react.tsx (<WebAgentsDevtools />,
                        TanStack plugin), event-client.ts; keeps window.agent.run
capture/                the docs media harness: playwright.config.ts (webServer for the four apps; stills, mobile, clips
                        projects), *.capture.ts, encode.mjs (ffmpeg → docs/media, budgets: clips ≤ 1.5 MB, hero.gif ≤ 3 MB)
docs/                   the docs site's content (apps/docs renders it): index.mdx, getting-started/, concepts/, guides/
                        (incl. deploy.md), examples/ (.mdx, Blume components), and reference/<package>/<api>.md, one file per
                        public API (.md); update reference/ with the API, and the guide/concept page a change affects.
                        Each folder has a meta.ts (sidebar title + page order); reference READMEs set `slug: reference/<pkg>`
.agents/plans/          roadmap + phase plans (execute with /execute <plan>)
tsconfig.base.json      shared compiler options (incl. customConditions)
```

---

## Architecture

- **Tools are pure.** Tool components (`apps/*/src/tools`) never import visuals. The only contract with the visual layer
  is the `toolname="<tool name>"` attribute on the element a tool acts on.
- **The visual layer is event-driven.** `installAgentVisuals()` (packages/core/src/visuals.ts) listens to `input`
  (capture), `submit` with `agentInvoked` (capture), `toolactivated`/`toolcancel` (on `document.modelContext`, or
  `window` before Chrome 156) and trusted user input. In `sync` mode it holds agent fills/submits and wraps
  `registerTool` so the page reacts at the cursor's click. Native Chrome and the polyfill fire events in different
  orders; runs start on whichever signal arrives first.
- **Lifecycle.** Installs are ref-counted; `destroy()` on the last handle removes all DOM, listeners, timers and restores
  `registerTool`. A detached `GhostCursor` never rebuilds DOM and fast-forwards (behaves like "yielded").
- **Events.** `onAgentEvent` delivers `start | fill | park | result | error | cancel | yield | resume`; the `log` option
  gets the same payloads. Devtools and the chat widget (later phases) build on this, not on internals.
- **Never unregister a tool synchronously from UI code.** Chrome cancels a call whose tool changes; React remounts on
  purpose. Release through `deferRelease` + a `CallTracker` (the registry and `useWebTool` do), so StrictMode and route
  swaps cause no `toolchange` churn and in-flight calls finish first.
- **Only core, polyfill, devtools and chat touch `document.modelContext`.** WebMCP is an origin-trial API whose shapes
  move; keep feature detection in those packages.

---

## Code Patterns

### Naming & files
- kebab-case files, camelCase functions, PascalCase types/classes, `XxxOptions` for option bags.
- TSDoc `/** … */` on every export and every option (explain *why*, and defaults).
- Section banners inside long functions: `// ---------- n. title ----------`.
- Short "why" comments; don't narrate what the code does.

### Packages
- `exports` use the custom condition `"@webmcp-agents/source": "./src/….ts"` first, then `types`/`import` → `dist`.
  Apps set `resolve.conditions: ["@webmcp-agents/source", ...defaultClientConditions]`; `tsconfig.base.json` sets
  `customConditions`. So dev and typecheck use source; never import from another package's `src/` by path
  (exception: core's tests import the polyfill source, because a dependency would be a cycle).
- Packages that need WebMCP types import them by name from `@webmcp-agents/core` (`import type { ModelContext } …`), which
  also pulls the global declarations into their emitted `.d.ts`.
- No DOM access at import time (SSR-safe); `typeof document === "undefined"` → no-op.
- Library UIs (devtools, chat) put `data-web-agents-ui` (`UI_HOST_ATTR`) on their host so input there never yields the cursor.

### Visuals / motion
- Transforms and opacity only; one rAF loop; springs and minimum-jerk timing live in `motion.ts`.
- Every animation has a reduced-motion path (`reduced()`, `wait()` collapse to 0).
- Write fields like a user: native value setter + `input`/`change` events (React sees them).
- Only `isTrusted` input may count as the user.

### Tool descriptions
- Every tool (imperative `description`, declarative `tooldescription`) says: what it does and answers, when to use
  it, what it needs first (another tool, or the page it lives on), and what comes next. Parameters say where a value
  comes from, with an example. See `packages/react/README.md` "Writing tool descriptions".

### Errors
- A tool's failure is a readable result for the agent and the same text on the page, with an error code:
  `"Error [code]: …"` + `structuredContent.error` (`toolError`, `WebToolError`; codes in packages/core/src/result.ts).
  A tool waiting on the person calls `waitingForUser` so the agent's 30 s tool timeout doesn't fire.
- Event listeners must never break a tool run (`emit` catches and logs).

---

## Testing

- `*.test.ts`: Node environment, pure logic (motion, events, SSR import).
- `*.browser.test.ts`: real Chromium via Vitest browser mode; use `userEvent` from `vitest/browser` for **trusted**
  input (required for yield tests); targets must sit inside the ~414 px-wide test viewport.
- Helpers in `packages/core/src/test-utils.ts`: `fixture`, `toolForm`, `uniqueName` (the polyfill registry lives for
  the whole page, so tool names must be unique per test), `recordEvents`, `until`.
- Always `destroy()` visuals and remove fixtures in `afterEach`.
- Example apps: `apps/*/e2e/*.spec.ts` (Playwright, desktop + Pixel 7, reduced motion so the cursor snaps) drive
  tools through `window.agent` (`e2e/agent.ts`); a confirm gate is asserted via `[data-tool-submit-active]` + a
  real click. Apps typecheck twice: `tsconfig.json` (src, `vite/client`) and `tsconfig.node.json` (configs + e2e).

---

## Validation

Before finishing any change: `pnpm check`. For visual changes also run the playground and drive a tool
(`agent.run("add_to_cart_mug-01", { qty: 3 })` in DevTools, or the agent-browser skill), including moving the mouse
mid-run (the cursor must vanish and the tool still complete).

---

## Gotchas

- Vite 8's Lightning CSS warns that `:tool-form-active` / `:tool-submit-active` are unknown pseudo-classes. They are
  Chrome's native WebMCP states; the rules are kept in the output. Keep native and `[data-tool-…]` rules separate.
- Chrome cancels a call whose tool definition changes mid-flight; a form that hides itself after its own action must
  stay until the agent has its answer (`apps/playground/src/tools/useAnswerGrace.ts`).
- The agent-browser CLI's Chrome may produce no frames (rAF never fires, screenshots time out), which freezes the cursor
  and every gated tool. If so, drive the playground with Playwright's Chromium (`node_modules/playwright`) instead.
- `executeTool` arg shapes differ by Chrome version (object vs JSON string); use core's `executeTool()` (`packages/core/src/execute.ts`),
  never `document.modelContext.executeTool` directly from library UI.
- The devtools hotkey (Alt+Shift+A) is a trusted keydown on the page, so pressing it makes the cursor yield like any
  other key; drive tools ~1 s later in scripted checks (input inside the panel itself never yields).
- Example apps pass the cart / booking store and `navigate` to catalog tools as `ctx.context` (typed by a `Register`
  augmentation in `src/tools/context.ts`). Store actions read/write a ref, so back-to-back agent calls see each other.
- Forms that navigate away answer first and navigate after the grace (`apps/*/src/lib/afterAnswer.ts`); a page whose
  own tool empties it (checkout, booking) keeps rendering until then.
- `@webmcp-agents/chat` runs one model step per request; tools run in the browser between steps. After each tool call (and
  before a run) the session waits for the page's tools to settle (`toolchange` quiet for ~150 ms), or a navigation's new
  tools miss the next request. Claude Opus 5.5 can't disable thinking: signed reasoning is kept in the history
  (`AgentPart` "reasoning") and sent back; `maxOutputTokens` must leave room for it.
- `docs/media/**` is generated: change a capture spec and run `pnpm capture` (ffmpeg on PATH); never hand-edit. Chat
  stills that need a live model are skipped without a key in `apps/ecommerce/.env.local`. Clips are `<video>` with
  WebM + MP4 sources in `.mdx`; stills are relative PNGs (Blume converts them to WebP).
- Edit the registry blocks in `registry/default/**`, then copy them to `apps/nextjs/components/web-agents/`
  (`cp registry/default/*/agent-*.tsx apps/nextjs/components/web-agents/`): the registry test fails when they differ.
  The blocks import `cn` from the `cn` package and primitives from `@/components/ui/*`, as shadcn's base style does.
- The landing's blocks (`apps/docs/components/opendesigns`) come from the OpenDesigns registry (`apps/docs/components.json`):
  `OPENDESIGNS_TOKEN=… pnpm dlx shadcn@latest add @opendesigns/<block>` inside `apps/docs`. The token is personal and never
  goes in the repo. The installed copies are ours to edit (reworded labels, slots, `toolName` on links); Biome ignores
  `components/opendesigns`, `components/ui`, `landing.css` and `pages/` (it cannot see an Astro template's use of its
  frontmatter). Their `@/…` imports resolve through an alias set in `blume.config.ts` (Blume's Astro root is `.blume/`).
- The landing and the docs are two stylesheets on purpose: shadcn and Blume both name tokens `--background`, `--muted`,
  `--accent` with different meanings. What they share comes from Blume: the fonts (`theme.fonts`, `--blume-ff-geist`), the
  favicon, and the theme (`data-theme` on `<html>`, `localStorage["blume-theme"]`; `lib/theme.ts` writes the same key).
- A link a tool acts on must be a plain `<a toolname>` (the blocks' `toolName` prop), not a React Aria `Link`/`Button`:
  React Aria drops unknown attributes, and its press handling re-fires a `click()` when the trusted click was stopped,
  so a `requireConfirmation` click would still follow the link.
- The cursor scrolls its target to the middle of the viewport when the target is within 64 px of the fold, so
  `show_demo` targets a demo frame's bar (`data-demo-bar`), not the frame. On the Demos page a frame is header-wide
  unless the window is too short to show all of it (`landing.css`, `.demo .demo-well`).
- Blume mounts every internal header link under `basePath`: the docs header's Demos action is `/docs/demos`, a
  redirect page (`pages/docs/demos.astro`) to `/demos`.
- `scripts/record-demo.sh` waits for the cursor's own parked state (`.agent-cursor.is-waiting`) before the trusted
  click: native Chrome sets `:tool-submit-active` as soon as a call starts, before the cursor has typed.
- A hidden Browser pane (or a backgrounded tab) fires no rAF: the cursor freezes mid-flight and form tools never finish.
  Show the pane before driving the site's tools there.
- Turbopack's CSS parser rejects `:tool-form-active` / `:tool-submit-active`: in Next, serve `cursor.css` from `public/`
  (`apps/nextjs/scripts/copy-cursor-css.mjs`), never import it through the Tailwind pipeline.
- Agents: `defineWebAgent` is plain shared data; the browser sends only the agent **id** and the server reads
  instructions from `createChatHandler({ agents })` (also `webAgentsChatDev({ agents })` in dev: dev `/api/chat` never
  goes through `api/chat.ts`). Sub-agents are client-executed `delegate_to_<id>` tools run by the session on the same
  adapter; never a server-side loop (page tools must run in the browser).
- Model ids are `<provider>/<model>`; a provider's `@ai-sdk/*` package is an optional peer loaded with a literal
  `import()` only when its key is set; `openrouter/<vendor>/<model>` ids split at the first slash; bare `claude-…` ids
  never reroute to the gateway (dash vs dot catalogs).
- `webAgentsChatDev` refuses to start `vite dev` when a `VITE_*` variable is named like a secret (`*_API_KEY`,
  `*_SECRET`, `*_TOKEN`): Vite inlines every `VITE_` variable into the client bundle. Keys stay server-side, unprefixed.
- The on-device model's "is it cached?" answer comes from transformers.js in the worker
  (`ModelRegistry.is_pipeline_cached`, per dtype and device), never from localStorage. A cached model loads with
  `AdapterStatus` `loading` (with `progress`), a real download with `downloading`: the chat words them differently.
- `@webmcp-agents/local-agent` loads transformers.js only inside its worker (`new Worker(new URL("./worker.ts", …))` in
  source; a tsdown plugin rewrites it to `./worker.js` in dist). Apps need `optimizeDeps.exclude` for the package and
  transformers, and `worker: { format: "es" }`. pnpm denies the install scripts of transformers' Node-only deps
  (`allowBuilds` in pnpm-workspace.yaml). Unit tests never download a model.
- Node-environment Vitest tests that import *another* workspace package at runtime need
  `ssr: { resolve: { conditions: ["@webmcp-agents/source", ...defaultServerConditions] } }`, else they load its stale `dist`.
- Vercel's function bundler resolves `api/chat.ts` imports with default conditions (`dist`, not `src`): a package used
  there must build what its `exports` name (tsdown `platform: "node"` emits `.mjs`; publint in the build catches it).
- Library CSS is unlayered on purpose: an app's plain `button { color: inherit }` beats any `@layer` rule.
- Only `packages/chat/src/server/**` may import a provider SDK (`@ai-sdk/*`, `@openrouter/*`; Biome `noRestrictedImports` override).
- Example drawers/sheets are non-modal (`role="dialog"` + `inert` page), never `showModal()`: the top layer would hide
  the agent cursor and make the devtools inert.
- Devtools browser tests pre-bundle React in `optimizeDeps.include`; a dependency discovered mid-run reloads Vite and
  leaves two copies of React ("Cannot read properties of null (reading 'useState')").
- The docs site (`apps/docs`, Blume): `blume build` refuses while `blume dev` runs (they share `.blume/`), so stop
  `pnpm dev` before `pnpm check`. Reference pages stay `.md`; in `.mdx` pages a bare `{` or `<` in prose is JSX (keep them in backticks). A new package folder in `docs/`
  needs a README `slug` and a `meta.ts`; a new page goes in its folder's `meta.ts` `pages`. `pnpm-workspace.yaml` overrides `satteri` for `blume` (two copies break every
  page). `blume check` crashes (native type-checker), so the app has no `typecheck`. `apps/docs/turbo.json` makes
  `docs/**` a build input; Turbo would otherwise replay a stale cached site.
