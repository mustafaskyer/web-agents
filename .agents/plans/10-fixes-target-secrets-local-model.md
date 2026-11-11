# Feature: three fixes — `target` fallback, secrets stay server-side, on-device model loading + picker, Phase 10

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

Read first:
- `.agents/plans/00-web-agents-roadmap.md` (contracts: `AgentAdapter`, `AdapterStatus`)
- `.agents/plans/06-in-browser-agent.md` (how the transformers provider, worker and download card were built)

## Feature Description

Three independent fixes reported by the maintainer on 2026-11-08:

1. **`target` feels required.** It is optional (`[toolname="<id>"]` is the default), but a string target that matches
   nothing returns `null` instead of falling back, and the docs never say when `target` is needed.
2. **Secrets and agent configuration must stay off the client.** The server boundary exists; add a dev-time guard
   against `VITE_*` secrets and document where each thing lives (Vite SPA, Next.js/RSC, TanStack Start).
3. **The on-device model "re-downloads" every time the chat opens.** It does not: the Cache API has the files, but a
   cache read is shown as a download, and a missing localStorage hint shows a real Download button. Fix the status,
   use transformers.js's exact cache check, and add a **model picker** (several local models, a brief and size each).

## User Story

As a developer
I want tool authoring to need no `target` in the common case and the docs to say so
So that I only write a target function for one-row-per-call tools

As a visitor
I want a cached model to load without a "Downloading…" scare, and to choose a smaller or smarter local model
So that the on-device assistant feels trustworthy and fits my device

## Problem Statement

- `packages/core/src/visuals.ts:223-228` `byTool`: `querySelector(explicitSelector)` → `null`, no fallback;
  `web-tool.ts:253` passes the same string for `[CONFIRM]`.
- `packages/chat/src/vite/index.ts` forwards env but never warns about `VITE_*_API_KEY`.
- `packages/local-agent/src/index.ts:105` sets `downloading` for every lazy first load; `providers/transformers/
  provider.ts:164-185` `availability()` needs the `web-agents:local-model` hint **and** a key scan (`inBrowserCache`,
  dtype-blind) to report `cached`; transformers.js emits identical progress events for cache reads (`hub.js:366-431`);
  `DownloadCard.tsx` has no "loading from this device" state; `createLocalAdapter` drops `dtype` (`index.ts:45`); the
  `MODELS` table (`provider.ts:13-22`) has sizes but no label or brief; nothing lists or selects models.

## Solution Statement

- B1: `byTool` and the confirm selector fall back to `[toolname]` when an explicit string matches nothing; delete the
  redundant string target on the playground's `remove_promo`; a "Where the cursor goes" ladder in the docs.
- B2: the Vite plugin fails `vite dev` on `VITE_*` names matching `/(_API_KEY|_SECRET|_TOKEN)$/`; docs sections.
- B3: `AdapterStatus.loading` gains `progress?`; `needs-download` drops `cached`; the provider asks the worker
  `ModelRegistry.is_pipeline_cached(...)` and emits `loading` for a cached pipeline, `downloading` otherwise;
  `AgentAdapter` gains optional `models()` / `selectModel(id)`; `ModelChoice { id, label, brief, bytes?, cached?,
  recommended? }`; `DownloadCard` renders a radio list when more than one model is offered.

## Feature Metadata

**Feature Type**: Bug fixes + small feature
**Estimated Complexity**: Medium
**Primary Systems Affected**: `packages/core` (visuals, web-tool), `packages/chat` (vite plugin, types, DownloadCard,
AgentChat), `packages/local-agent` (adapter, transformers provider, worker protocol), `apps/playground`, docs
**Dependencies**: none new (`@huggingface/transformers` 4.3.2 already exports `ModelRegistry`)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `packages/core/src/visuals.ts` 223-228 (`byTool`), 511-521 (`registerTool` wrapper storing `[TARGET]`), 529-585
  (`runGated` / `runUnseen`). Why: the fallback lives in `byTool`; a function target already falls back on `undefined`.
- `packages/core/src/web-tool.ts` 79-84 (`target?` TSDoc), 215-259 (`toModelContextTool`: `fallback`, `targetFor`,
  `[CONFIRM]`, `[TARGET]`). Why: the confirm selector must fall back too.
- `packages/core/src/confirm.ts` 36-49 (`ConfirmationUnavailableError`). Why: document what happens with no element.
- `packages/core/src/visuals.browser.test.ts` and `test-utils.ts` (`fixture`, `toolForm`, `uniqueName`, `until`).
- `apps/playground/src/tools/catalog.ts:51` (`remove_promo` string target).
- `packages/chat/src/vite/index.ts` (`ENV_KEYS`, `loadEnv`, `createChatHandler({ env })`); `packages/chat/test/vite-plugin.test.ts`.
- `packages/chat/src/types.ts` 20-27 (`AdapterStatus`), 87-98 (`AgentAdapter`).
- `packages/chat/src/components/DownloadCard.tsx`, `AgentChat.tsx` 134-159 (placeholder + card), `AdapterSwitcher.tsx`,
  `session/use-adapter-status.ts`.
- `packages/local-agent/src/index.ts` 44-177 (`createLocalAdapter`, `fromAvailability` 58-66, lazy `run` 125-137,
  `set({ state: "downloading" })` at 105), `src/types.ts` (`LocalProvider`, `ProviderAvailability`).
- `packages/local-agent/src/providers/transformers/provider.ts` (MODELS 13-22, `READY_KEY` 43, `inBrowserCache`
  68-75, `availability` 164-185, `prepare` 187-228, `terminate` 138-146), `engine.ts` (40-72 progress, 112 dispose),
  `worker.ts`, `protocol.ts`, `guard.ts` (memory check 55-66).
- `packages/local-agent/test/adapter.test.ts` 182-200 (asserts `downloading` for a cached model: to change),
  `worker-protocol.test.ts` (how the engine is driven with an injected `PipelineKit`).
- `node_modules/.pnpm/@huggingface+transformers@4.3.2*/node_modules/@huggingface/transformers/src/utils/model_registry/ModelRegistry.js`
  268-412 (`is_pipeline_cached(task, modelId, { dtype, device })`, `clear_cache`).
- Docs to update: `docs/concepts/tools.mdx`, `docs/reference/core/define-web-tool.md`, `docs/guides/chat.mdx`
  (Security), `docs/reference/chat/web-agents-chat-dev.md`, `docs/reference/chat/adapter-types.md`,
  `docs/reference/local-agent/{create-transformers-provider,create-local-adapter}.md`, `docs/guides/on-device-agent.mdx`.

### New Files to Create

```
packages/local-agent/test/transformers-provider.test.ts     availability/prepare/selectModel with a stubbed Worker
packages/chat/test/model-picker.browser.test.tsx             DownloadCard radio list with a fakeAdapter exposing models()
```

### Patterns to Follow

- Browser tests use `userEvent` from `vitest/browser` for trusted input; always `destroy()` visuals and remove fixtures.
- Status objects are compared by `JSON.stringify` in `useAdapterStatus`: emit new objects only on change.
- Library UI text: `ux-copy` skill; radios in a `<fieldset>` with a `<legend>` (`a11y`).
- Do not grow core past its budget: the fallback is a `??`; run `pnpm --filter @webmcp-agents/core size`.

---

## IMPLEMENTATION PLAN

### Phase 1: core fallback (B1)
### Phase 2: dev guard (B2)
### Phase 3: local-agent status + cache check (B3a)
### Phase 4: model picker (B3b)
### Phase 5: docs

---

## STEP-BY-STEP TASKS

### 1. UPDATE `packages/core/src/visuals.ts` `byTool`

Resolve the explicit selector; when it is a string and `querySelector` returns `null`, use the `[toolname]` default.
Keep function targets as they are (they already fall back on `undefined`). Add a browser test: a tool with
`target: "#nope"` and a `[toolname]` button → the cursor lands on the button.

### 2. UPDATE `packages/core/src/web-tool.ts` confirm selector

`[CONFIRM]`: when `tool.target` is a string, pass both (`target ?? fallback` is already the shape; make
`waitForConfirmation` try the explicit selector and then the fallback). Test: a confirm-gated tool with a stale string
target parks on the `[toolname]` element. TSDoc for `target`: "Usually unnecessary: put `toolname` on the element.
Use a function for one-element-per-call tools (a row in a list)."

### 3. UPDATE `apps/playground/src/tools/catalog.ts`

Remove `target: '[toolname="remove_promo"]'`. Verify `agent.run("remove_promo")` still parks on the button.

### 4. UPDATE `packages/chat/src/vite/index.ts` dev guard

After `loadEnv`, collect keys matching `/^VITE_.*(_API_KEY|_SECRET|_TOKEN)$/`; if any, throw an Error from
`configResolved` (fails `vite dev` and `vite build`) with: `VITE_* variables ship to the browser: rename <KEY> and keep
it server-side (the chat handler reads it from the server env).` Option `secretGuard?: false` to opt out. Test in
`test/vite-plugin.test.ts` with a temp `.env.local`.

### 5. UPDATE `packages/chat/src/types.ts`

```ts
| { state: "loading"; progress?: number }                     // a cached model being read from disk / compiled
| { state: "needs-download"; bytes?: number; note?: string }  // `cached` removed
export interface ModelChoice { id: string; label: string; brief: string; bytes?: number; cached?: boolean; recommended?: boolean }
// AgentAdapter:
models?(): readonly ModelChoice[];
selectModel?(id: string): Promise<void>;
```

### 6. UPDATE transformers worker protocol + engine

`protocol.ts`: `{ type: "cached?", model, dtype, device }` → `{ type: "cached", value: boolean }` using
`ModelRegistry.is_pipeline_cached("text-generation", model, { dtype, device })` (dynamic import inside the worker, like
`pipeline`). `engine.ts`: `isCached()`; `worker-protocol.test.ts`: the kit gets an injectable `isPipelineCached`.

### 7. UPDATE `providers/transformers/provider.ts`

- `MODELS`: add `label`, `brief` per entry (copy below); keep `bytes` per dtype.
  - Qwen3 0.6B — "Fastest. Good at short tool calls. The default."
  - Qwen3 1.7B — "Better reasoning. Needs 8 GB of memory and WebGPU."
  - LFM2.5 1.2B — "Strong tool calling in a mid-size model."
- Options: `models?: ModelId[]` (default: the current single default), `model?` (initial), `dtype?`.
- `availability()`: `loaded` → `available`; else ask the worker `cached?` → `{ state: "available", lazy: true }`
  (replaces `needs-download + cached`), else `needs-download { bytes }`. The localStorage record becomes
  `web-agents:local-model` = `{ [modelId]: dtype }` for the synchronous first paint only.
- `prepare()`: emit `loading { progress }` when cached, `downloading { progress }` otherwise (the progress numbers are
  the same events).
- `models()`: map `MODELS` for the offered ids, `cached` from the last check, `recommended` for the default.
- `selectModel(id)`: refuse while a run is in flight (`Error [busy]`), `terminate()`, switch `model`, persist
  `web-agents:local-model:choice`, re-run `availability()`, notify subscribers.

### 8. UPDATE `packages/local-agent/src/index.ts`

`createLocalAdapter({ models?, model?, dtype? })` passes them through; `fromAvailability` maps the provider's
`available + lazy` to `ready`; the lazy first `run()` forwards the provider's `loading`/`downloading` as emitted
(no more hard-coded `downloading`); expose `models()` / `selectModel()` when the active provider has them. Update
`adapter.test.ts:182-200` to expect `loading`.

### 9. UPDATE chat UI

`DownloadCard.tsx`: `loading` → title "Loading the model from this device…" + progress; `needs-download` keeps the
consent copy and the **Download** button; when `adapter.models?.()` has more than one entry render a `<fieldset>`
radio list (label, brief, size, "on this device", "recommended") above the button, selection → `selectModel`.
`AgentChat.tsx` placeholder: "Loading the model… N%" for `loading`. Browser test with a `fakeAdapter`.

### 10. Docs

- `docs/concepts/tools.mdx`: "Where the cursor goes" (toolname → no element = unseen, confirmation needs one →
  `target` function for rows). `docs/reference/core/define-web-tool.md` `target` row: the same three lines.
- `docs/guides/chat.mdx` Security: "Where secrets live" (Vite SPA guard; Next.js/RSC: route handler + taint; TanStack
  Start: Vite env rules). `docs/reference/chat/web-agents-chat-dev.md`: `secretGuard`.
- `docs/reference/chat/adapter-types.md`: `loading.progress`, `ModelChoice`, `models`/`selectModel`.
- `docs/reference/local-agent/create-transformers-provider.md` + `create-local-adapter.md`: `models`, `dtype`, the
  cache check, the storage keys. `docs/guides/on-device-agent.mdx` "Downloaded once" → the picker and "loads from this device".
- Changeset: patch core, minor chat + local-agent.

---

## VALIDATION COMMANDS

```bash
pnpm biome ci .
pnpm --filter @webmcp-agents/core exec vitest run --project core:browser
pnpm --filter @webmcp-agents/core size
pnpm --filter @webmcp-agents/chat test
pnpm --filter @webmcp-agents/local-agent test
pnpm check
```

Manual: playground → `agent.run("remove_promo")` parks on the button; `VITE_TEST_API_KEY=x` in `.env.local` fails
`vite dev` with the guard text; ecommerce → switch to On-device, download once, reload → "Loading the model from this
device…", no Download button; clear localStorage only → still ready; pick Qwen3 1.7B → consent card with 1.4 GB, the
choice survives a reload.

## ACCEPTANCE CRITERIA

- [ ] A string `target` that matches nothing falls back to `[toolname]` for the cursor and the confirmation
- [ ] `vite dev` refuses `VITE_*` secrets unless `secretGuard: false`
- [ ] A cached model never shows "Downloading"; a missing hint never shows the Download button when the Cache API has the files
- [ ] More than one local model → a radio list with label, brief, size and cache state; the choice persists
- [ ] Docs updated as listed; `pnpm check` green; core within budget
