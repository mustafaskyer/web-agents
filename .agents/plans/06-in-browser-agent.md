# Feature: In-browser agent adapter (`@web-agents/local-agent`), Phase 6

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

Read first:
- `.agents/plans/00-web-agents-roadmap.md` (contracts)
- `.agents/plans/05-chat-widget-cloud-agent.md` (the `AgentAdapter` implementation this phase mirrors)

## Feature Description

An `AgentAdapter` that runs **entirely in the visitor's browser**: no server, no API key, and no page content leaving
the device. It plugs into `<AgentChat adapters={[cloud, local]} />` from Phase 5 behind the exact same interface.
There are two providers behind one adapter:

1. **Transformers.js v4** (`@huggingface/transformers` 4.3.x, ONNX Runtime Web). It runs a small Qwen3 instruct model
   in a module Web Worker on WebGPU, falling back to WASM, with native chat-template `tools` support. The
   ~1 GB model downloads once, behind an explicit opt-in with a progress bar, and is persisted in the Cache API.
2. **Chrome Prompt API** (`LanguageModel`). It costs nothing to download per site when Chrome's built-in model is
   available. Native tool use isn't shipped in stable yet, so tool calls are produced with **JSON-schema-constrained
   output** (`responseConstraint`), with native `tools` used when feature-detected.

A shared, provider-agnostic agent loop handles the rest:
- prompting tuned for small models (few tools, compact schemas, strict JSON);
- tool-call parsing;
- max steps;
- per-step timeouts;
- abort.

## User Story

As a privacy-conscious visitor (or a site owner who doesn't want an LLM bill)
I want the assistant to run on my own device
So that I can drive the page by chat without sending my data to a server

As a developer
I want `createLocalAdapter()` to be a drop-in alternative to `createCloudAdapter()`
So that I can offer both and let users choose

## Problem Statement

The cloud adapter needs a key, a server route and network access, and it sends page/tool data to a provider. TODO
item #5 asks for agents that "totally run in the browser". Small local models are weak at tool calling, so naive
integration produces malformed calls, hallucinated tools and runaway loops. Model downloads of 1–2 GB need consent,
progress and caching, or the UX is hostile.

## Solution Statement

- **One adapter, pluggable `LocalProvider`s.** `createLocalAdapter({ providers? })` picks the first available provider
  in order (default: Prompt API if `available`, else transformers.js). `status()` reflects availability and download
  state; `prepare()` performs the opt-in download.
- **Worker isolation.** Transformers.js runs in a module Worker with a typed message protocol, so a 1–2 s token
  loop never janks the ghost cursor's rAF animation (the "priorities" item: performance and animation).
- **Shared loop** (`loop.ts`) over a minimal `generate()` contract:
  - build the prompt;
  - generate;
  - parse tool calls;
  - `callTool` sequentially;
  - append the results;
  - repeat up to `maxSteps` (default 4), with a per-step timeout (default 60 s).
- **Small-model prompting.**
  - Rank tools against the user message and keep ≤ 8.
  - Compact the schemas (drop `$schema`, `additionalProperties`, long descriptions).
  - Disable Qwen3 thinking. Use greedy decoding.
  - Strip `<think>` blocks. Validate tool names and arguments against the schema before calling.
  - Return validation errors to the model as tool errors so it can self-correct once.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**:
- `packages/local-agent` (new)
- `packages/chat` (adapter switcher + opt-in download UI)
- `apps/playground` (and examples) wiring
- roadmap contract

**Dependencies**:
- `@huggingface/transformers` ^4.3.2
- `@types/dom-chromium-ai` ^0.0.18 (dev)
- `@web-agents/chat` (types only)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.agents/plans/00-web-agents-roadmap.md`: the `@web-agents/local-agent` contract `createLocalAdapter({ model?, worker? })`, the in-browser decision row, and the risks ("1–2 GB downloads; opt-in; Cache API; progress").
- `packages/chat/src/types.ts` (Phase 5). Why: `AgentAdapter`, `AgentRunRequest` (`tools` is a **getter**, so read it fresh each step), `AgentStreamPart`, `AdapterStatus` (`needs-download` / `downloading{progress}` / `loading` / `unavailable`), and `prepare?()`.
- `packages/chat/src/adapter/cloud.ts` (Phase 5). Why: **MIRROR** the generator loop structure:
  - `message-start` → deltas → `tool-call` → `tool-result` / `tool-error` → `step-finish` → `finish(reason)`;
  - abort handling;
  - sequential tool execution.
- `packages/chat/src/server/system-prompt.ts` (Phase 5). Why: reuse the rules (live page, confirmations, "Error:" prefix) in a shorter local variant.
- `packages/chat/src/server/validate.ts` (Phase 5) `sanitizeSchema`. Why: reuse for compact schemas. Import it via a shared non-server module. If it lives under `server/`, move it to `packages/chat/src/schema.ts` and re-export.
- `packages/chat/src/components/AgentChat.tsx` (Phase 5). Why: add the adapter switcher and the download card here.
- `packages/chat/src/session/use-agent-session.ts` (Phase 5). Why: the session must re-read `adapter.status()` and re-render on status changes. Add `subscribe?` (Task 3).
- `packages/core/src/cursor.ts` lines 41-46 (`reduced()`, `wait()`). Why: progress UI and any animation must honour reduced motion.
- `packages/devtools/package.json` / `packages/chat/package.json`. Why: **MIRROR** the exports with the `"@web-agents/source"` condition and the tsdown setup.

### New Files to Create

```
packages/local-agent/
  package.json, tsconfig.json, tsdown.config.ts, vitest.config.ts, README.md
  src/index.ts                         createLocalAdapter, detectLocalProviders, types
  src/types.ts                         LocalProvider, GenerateRequest, GenerateResult, ProviderAvailability
  src/loop.ts                          runLocalAgent(): shared agent loop → AsyncIterable<AgentStreamPart>
  src/prompt.ts                        buildLocalSystemPrompt(), toChatTemplateMessages()
  src/tools.ts                         rankTools(), compactSchema(), validateArgs()
  src/tool-call-parser.ts              parseToolCalls(text, toolNames) → { text, calls, errors }
  src/providers/transformers/protocol.ts   worker message types
  src/providers/transformers/engine.ts     TransformersEngine (pure, runs inside the worker; injectable pipeline factory)
  src/providers/transformers/worker.ts     self.onmessage → handleMessage(engine, msg, post)
  src/providers/transformers/provider.ts   main-thread LocalProvider talking to the worker
  src/providers/prompt-api/provider.ts     Chrome LanguageModel provider
  test/tool-call-parser.test.ts
  test/tools.test.ts
  test/loop.test.ts
  test/worker-protocol.test.ts
  test/prompt-api.test.ts
  e2e/local-model.spec.ts              gated by E2E_LOCAL_MODEL=1 (manual / nightly)
packages/chat/src/components/AdapterSwitcher.tsx
packages/chat/src/components/DownloadCard.tsx
```

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

Transformers.js:
- [Transformers.js docs: pipelines](https://huggingface.co/docs/transformers.js/pipelines) and [WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu). Why: `pipeline("text-generation", id, { device: "webgpu", dtype })`.
- [Transformers.js releases](https://github.com/huggingface/transformers.js/releases): 4.2.0 added `tools` to `TextGenerationPipeline`; 4.3.0 added constrained output. Why: verify the exact option names (`tools`, chat-template kwargs such as `enable_thinking`) in the installed `.d.ts`.
- [Transformers.js `env` settings](https://huggingface.co/docs/transformers.js/api/env). Why: `env.useBrowserCache` (Cache API), `env.allowLocalModels`, `env.backends.onnx.wasm` (WASM threads need cross-origin isolation).
- [`TextStreamer`](https://huggingface.co/docs/transformers.js/api/generation/streamers). Why: token streaming → `text-delta`.
- [onnx-community on Hugging Face](https://huggingface.co/onnx-community). Why: **verify the exact repo ids** (expected `onnx-community/Qwen3-1.7B-ONNX` and `onnx-community/Qwen3-0.6B-ONNX`), the available `dtype`s (`q4f16`, `q4`), and file sizes on each model card.
- [Qwen3 function-calling format](https://qwen.readthedocs.io/en/latest/framework/function_call.html). Why: Hermes-style `<tool_call>{"name":…, "arguments":{…}}</tool_call>` output, and the `/no_think` / `enable_thinking=False` switch.

Chrome Prompt API:
- [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api). Why:
  - `LanguageModel.availability()` (`unavailable | downloadable | downloading | available`)
  - `LanguageModel.create({ initialPrompts, monitor, signal })`
  - `session.prompt(input, { responseConstraint, signal })`
  - `promptStreaming`
- [Prompt API explainer: tool use](https://github.com/webmachinelearning/prompt-api#tool-use) and [structured output](https://github.com/webmachinelearning/prompt-api#structured-output-with-json-schema-or-regexp-constraints). Why: the native `tools` shape when present, and `responseConstraint` for the fallback.

Web platform:
- [MDN: Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) and [`StorageManager.persist()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist). Why: keep the model across sessions; show `estimate()` free space before download.
- [MDN: WebGPU `requestAdapter`](https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter). Why: feature detection.
- [Vite: Web Workers](https://vite.dev/guide/features#web-workers) and [`optimizeDeps.exclude`](https://vite.dev/config/dep-optimization-options#optimizedeps-exclude). Why: worker bundling from a dependency (see GOTCHAs).

### Patterns to Follow

**Generator loop shape.** Mirror `packages/chat/src/adapter/cloud.ts` from Phase 5:
```ts
async *run(req) {
  const history = structuredClone(req.messages);
  for (let step = 1; step <= maxSteps; step++) {
    const messageId = crypto.randomUUID();
    yield { type: "message-start", messageId };
    // … stream text-delta, collect calls …
    if (calls.length === 0) { yield { type: "finish", reason: "stop" }; return; }
    for (const call of calls) {                      // sequential: one cursor, one page
      const output = await req.callTool(call);
      yield output.isError ? { type: "tool-error", id: call.id, error: textOf(output) } : { type: "tool-result", id: call.id, output };
    }
    yield { type: "step-finish", step };
    if (req.signal.aborted) { yield { type: "finish", reason: "aborted" }; return; }
  }
  yield { type: "finish", reason: "max-steps" };
}
```

**Defensive parsing** of native-vs-polyfill shapes. Same spirit as `console.ts:18-25` `parseSchema`: never throw on
model output; degrade to plain text.

**Feature detection** like core `onLifecycle` (`visuals.ts:115-119`): probe, then fall back silently. Never assume a
preview API's shape.

**Style:** file-header "why" comments, named exports, TSDoc on public options, error messages that name the fix.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

- Scaffold the package. Define `LocalProvider`. Write the pure modules: parser, tools ranking/compaction/validation, prompt.

### Phase 2: Core Implementation

- Shared loop. The transformers engine plus the worker protocol plus the main-thread provider. The Prompt API provider.
- `createLocalAdapter` with provider selection, status, and prepare.

### Phase 3: Integration

- Chat: an observable `status`, the adapter switcher, and the download consent card.
- Playground wiring with a Vite worker config. Roadmap update.

### Phase 4: Testing & Validation

- Pure node tests: parser, tools, loop, worker protocol, Prompt API with stubs.
- A gated Playwright test with a real model. Manual agent-browser run.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 1. CREATE `packages/local-agent` scaffold

- **IMPLEMENT**:
  - package.json:
    - `name: "@web-agents/local-agent"`, `type: module`, `sideEffects: false`.
    - Exports: `"."` → `src/index.ts` (source condition) / `dist/index.mjs`; `"./worker"` → `src/providers/transformers/worker.ts` / `dist/worker.mjs`.
    - `dependencies: { "@huggingface/transformers": "^4.3.2" }`.
    - `peerDependencies: { "@web-agents/chat": "workspace:^" }`, used for types only via `import type`.
    - `devDependencies: { "@types/dom-chromium-ai": "^0.0.18" }`.
  - tsdown: entries `{ index: "src/index.ts", worker: "src/providers/transformers/worker.ts" }`, `platform: "browser"`, `external: ["@huggingface/transformers", /^@web-agents\//]`.
  - tsconfig: `"types": ["@types/dom-chromium-ai"]`, plus `"lib": ["ES2023","DOM","WebWorker"]` only for the worker file. Use a `/// <reference lib="webworker" />` at the top of `worker.ts` instead of global lib mixing.
- **PATTERN**: `packages/chat/package.json` (Phase 5).
- **GOTCHA**:
  - Run `npm view @huggingface/transformers version` and `npm view @types/dom-chromium-ai version` first, and pin the results.
  - Transformers.js pulls `onnxruntime-web` (large WASM files). It must stay a runtime dependency loaded **only inside the worker**. The main-thread `index.mjs` must not import it (verified in Level 3).
- **VALIDATE**: `pnpm install && pnpm --filter @web-agents/local-agent typecheck`

### 2. CREATE `src/types.ts`

- **IMPLEMENT**:
  ```ts
  export type ProviderAvailability =
    | { state: "available" } | { state: "needs-download"; bytes?: number }
    | { state: "downloading"; progress: number } | { state: "unavailable"; reason: string };
  export interface GenerateRequest {
    system: string;
    messages: Array<{ role: "user" | "assistant" | "tool"; content: string; name?: string }>;
    tools: CompactTool[];                   // ≤ 8, compacted
    signal: AbortSignal;
    onToken?(delta: string): void;
  }
  export interface GenerateResult { text: string; calls: Array<{ name: string; arguments: unknown }> }
  export interface LocalProvider {
    readonly id: "transformers" | "prompt-api" | (string & {});
    readonly label: string;
    availability(): Promise<ProviderAvailability>;
    prepare(onProgress: (p: number) => void, signal?: AbortSignal): Promise<void>;   // download/load
    generate(req: GenerateRequest): Promise<GenerateResult>;
    dispose?(): void;
  }
  export interface CompactTool { name: string; description: string; parameters: JSONSchema }
  ```
- **VALIDATE**: `pnpm --filter @web-agents/local-agent typecheck`

### 3. UPDATE `@web-agents/chat` types: observable status

- **IMPLEMENT**:
  - Add `subscribe?(listener: () => void): () => void` to `AgentAdapter`, so download progress re-renders the widget.
  - In `use-agent-session.ts`, read status with `useSyncExternalStore(adapter.subscribe ?? noopSubscribe, () => adapter.status?.() ?? READY)`.
  - Update `packages/chat/src/types.ts` and the roadmap contract in the same commit.
- **GOTCHA**: `status()` must return a **referentially stable** object between changes, or `useSyncExternalStore` will loop. Cache it and replace it only on change.
- **VALIDATE**: `pnpm --filter @web-agents/chat typecheck && pnpm --filter @web-agents/chat test`

### 4. CREATE `src/tool-call-parser.ts`

- **IMPLEMENT**: `parseToolCalls(raw: string, toolNames: ReadonlySet<string>): { text: string; calls: ParsedCall[]; errors: string[] }`.
  1. Strip `<think>…</think>` (and an unterminated `<think>` prefix).
  2. Extract every `<tool_call>…</tool_call>` block (Qwen/Hermes).
  3. If there are none, accept a single fenced ```` ```json {…} ``` ```` block, or a whole-message JSON object with `name` + `arguments` (or `{type:"tool_call", name, arguments}` from the Prompt API path).
  4. `JSON.parse` each, with one lenient repair pass: strip trailing commas and convert single quotes **only** when the strict parse fails.
  5. `arguments` may arrive as a JSON string, so parse it again.
  6. Reject unknown names with an error like `Unknown tool "x". Available: a, b`.
  - `text` is the remaining prose with the tool-call blocks removed and trimmed.
- **GOTCHA**: never `eval`. Cap `raw` at 32 KB before regex work.
- **VALIDATE**: `pnpm --filter @web-agents/local-agent test -- tool-call-parser`

### 5. CREATE `src/tools.ts`

- **IMPLEMENT**:
  - `compactSchema(s)`: drop `$schema`, `$id`, `additionalProperties`, `examples`, `title`. Truncate `description` to 80 chars. Keep `type`, `properties`, `required`, `enum`, `minimum`, `maximum`, `items`.
  - `rankTools(tools: ToolDescriptor[], query: string, max = 8): CompactTool[]`. Score by token overlap of the lower-cased query against `name` (split on `_`) and the description, plus a small bonus for tools used in the last two turns. Keep the stable original order for ties. Always keep all tools when there are ≤ max.
  - `validateArgs(schema, args): string | null` is a tiny validator for `type`, `required`, `enum`, number `min`/`max` and integer, the same subset the devtools form uses. Do not pull in ajv.
- **VALIDATE**: `pnpm --filter @web-agents/local-agent test -- tools`

### 6. CREATE `src/prompt.ts`

- **IMPLEMENT**:
  - `buildLocalSystemPrompt({ pageTitle, url, toolsInline })` keeps it under ~600 tokens:
    - the role sentence;
    - the rules from the Phase 5 `system-prompt.ts`, condensed to five bullets;
    - the exact output format: "To use a tool, reply ONLY with `<tool_call>{"name": "...", "arguments": {...}}</tool_call>`. Otherwise reply in plain text."
    - one few-shot example built from the first ranked tool.
  - For Qwen via the chat template, tools go through the template's native `tools` param, not inline text. `toolsInline` is only for the Prompt API.
  - `toChatTemplateMessages(history: AgentMessage[])` maps tool parts to `{ role: "tool", name, content: textOf(output) }` (truncate to 1500 chars) and assistant tool calls to `<tool_call>` text, so the model sees its own prior calls.
  - Keep only the last 12 messages.
- **VALIDATE**: `pnpm --filter @web-agents/local-agent typecheck`

### 7. CREATE `src/loop.ts`

- **IMPLEMENT**: `async function* runLocalAgent(provider, req: AgentRunRequest, opts: { maxSteps = 4, stepTimeoutMs = 60_000 })`.
  - Per step:
    - `tools = rankTools(req.tools, lastUserText)` (read `req.tools` fresh each step);
    - `generate()` with `onToken` → yield `text-delta`. Buffer tokens and emit only text **outside** `<tool_call>`/`<think>` tags. The tag-aware streaming filter is a small state machine.
    - `parseToolCalls`;
    - validate the args;
    - an invalid call becomes a synthetic `tool-error` fed back as a `role:"tool"` message, but only **once per step**; a second failure finishes with a text apology.
    - Valid calls go through `req.callTool({ id: crypto.randomUUID(), name, input })` sequentially.
  - Timeout: `AbortSignal.any([req.signal, AbortSignal.timeout(stepTimeoutMs)])`. A timeout yields `error{ error: "The on-device model took too long. Try a shorter request or the cloud assistant." }`.
- **PATTERN**: Phase 5 `cloud.ts` generator; see Patterns above.
- **VALIDATE**: `pnpm --filter @web-agents/local-agent test -- loop`

### 8. CREATE transformers `protocol.ts` + `engine.ts` + `worker.ts`

- **IMPLEMENT**:
  - `protocol.ts` defines discriminated unions:
    - main → worker: `{id, type:"init", model, dtype, device}`, `{id, type:"generate", req: Omit<GenerateRequest,"signal"|"onToken">}`, `{id, type:"abort"}`, `{id, type:"dispose"}`;
    - worker → main: `{id, type:"progress", progress, file?, loaded?, total?}`, `{id, type:"ready", device}`, `{id, type:"token", delta}`, `{id, type:"done", result}`, `{id, type:"error", error}`.
  - `engine.ts`: `class TransformersEngine { constructor(createPipeline = defaultPipelineFactory) }`.
    - `init()` calls `pipeline("text-generation", model, { device, dtype, progress_callback })`. Aggregate per-file progress into one 0–1 number weighted by `total`.
    - `generate()` calls `generator(messages, { tools, max_new_tokens: 384, do_sample: false, streamer: new TextStreamer(tokenizer, { skip_prompt: true, callback_function }), chat_template_kwargs/enable_thinking: false })`. **Verify the exact option names in the 4.3 `.d.ts`**; pass `enable_thinking:false` where the API accepts template kwargs, and otherwise append `/no_think` to the system prompt.
    - Abort uses a `StoppingCriteria` (or `InterruptableStoppingCriteria`, if exported) toggled by the `abort` message.
  - `worker.ts`: `/// <reference lib="webworker" />`. Create one engine and route messages through the exported pure `handleMessage(engine, msg, post)`.
- **GOTCHA**:
  - Device selection: `navigator.gpu && await navigator.gpu.requestAdapter()` selects `webgpu` + `q4f16`. Otherwise use `wasm` + `q4`, and default to the 0.6B model, because 1.7B on WASM is unusably slow.
  - WASM multithreading needs COOP/COEP (cross-origin isolation). Don't require it; single-thread works. Document the headers for faster WASM.
  - `env.useBrowserCache = true` is the default; set it explicitly. Call `navigator.storage?.persist?.()` on the first successful download.
- **VALIDATE**: `pnpm --filter @web-agents/local-agent test -- worker-protocol`

### 9. CREATE transformers `provider.ts` (main thread)

- **IMPLEMENT**: `createTransformersProvider({ model?, dtype?, worker? }): LocalProvider`.
  - Spawn lazily on `prepare()`: `opts.worker ?? new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`.
    - Write the source with `./worker.ts`. Vite resolves it in source mode (the `@web-agents/source` condition), and tsdown rewrites it to the emitted worker chunk in the build.
    - **Verify the built `dist/index.mjs` references `worker.mjs`.** If tsdown doesn't rewrite `new URL(…)` worker references, add a post-build check, and fall back to requiring the `worker` option.
    - Always support the explicit escape hatch, and document it in the README: `import LocalWorker from "@web-agents/local-agent/worker?worker"; createLocalAdapter({ worker: new LocalWorker() })`.
  - `availability()`:
    - `needs-download` with `bytes` from a `HEAD` on the main ONNX file, or a constant table per model id;
    - `available` if `caches.open("transformers-cache")` already contains the model files (check the cache name in the docs);
    - `unavailable` when there is no `Worker` / `WebAssembly`.
  - `generate()` posts to the worker. Map `token` messages → `onToken`. `signal` → post `abort`.
- **GOTCHA**:
  - Vite pre-bundling breaks `new URL(…, import.meta.url)` inside dependencies. Apps must set `optimizeDeps: { exclude: ["@web-agents/local-agent", "@huggingface/transformers"] }` and `worker: { format: "es" }`. Put this in the README and the playground config (Task 13).
  - Verify the actual Cache API cache name used by transformers.js 4.x before relying on it. Otherwise fall back to a `localStorage` flag set after the first successful `ready`.
- **VALIDATE**: `pnpm --filter @web-agents/local-agent typecheck && pnpm --filter @web-agents/local-agent build && ! grep -q "onnxruntime" packages/local-agent/dist/index.mjs`

### 10. CREATE `providers/prompt-api/provider.ts`

- **IMPLEMENT**: `createPromptApiProvider(): LocalProvider`.
  - `availability()`: `typeof LanguageModel === "undefined"` → unavailable("Chrome's built-in model isn't available in this browser"). Otherwise map `await LanguageModel.availability({ expectedInputs:[{type:"text"}], expectedOutputs:[{type:"text"}] })`.
  - `prepare()`: `LanguageModel.create({ monitor(m){ m.addEventListener("downloadprogress", e => onProgress(e.loaded)) }, signal })`. Keep the base session and `clone()` it per conversation.
  - `generate()`:
    - **Native tools path** (feature-detected): try `LanguageModel.create({ tools: [...] })` once and cache whether it threw `TypeError`/`NotSupportedError`. If supported, use it and map tool-call outputs to `calls`.
    - **Fallback**: `session.prompt(serializedTurn, { responseConstraint: ACTION_SCHEMA, signal })`, where:
      ```json
      { "oneOf": [
        { "type":"object", "required":["type","text"], "properties": { "type": {"const":"message"}, "text": {"type":"string"} } },
        { "type":"object", "required":["type","name","arguments"], "properties": { "type": {"const":"tool_call"}, "name": {"enum": [<tool names>]}, "arguments": {"type":"object"} } } ] }
      ```
      Parse it with `parseToolCalls`. Stream text with `promptStreaming` only for `message` responses. A second, unconstrained call for prose is not needed: emit `text` as one delta.
- **GOTCHA**:
  - The Prompt API is desktop-Chrome-only and its shape changes between Chrome versions. Wrap every call in try/catch → `unavailable`.
  - `responseConstraint` support of `oneOf`/`const` must be verified. If unsupported, flatten to `{ type, name?, arguments?, text? }` with `type` as an `enum`.
- **VALIDATE**: `pnpm --filter @web-agents/local-agent test -- prompt-api`

### 11. CREATE `src/index.ts`: `createLocalAdapter`

- **IMPLEMENT**:
  ```ts
  export interface LocalAdapterOptions {
    providers?: LocalProvider[];        // default [createPromptApiProvider(), createTransformersProvider()]
    model?: string;                     // transformers model id, default verified Qwen3 1.7B ONNX id
    worker?: Worker;
    maxSteps?: number;                  // default 4
    stepTimeoutMs?: number;             // default 60_000
    label?: string;                     // default "On-device"
  }
  export function createLocalAdapter(opts?: LocalAdapterOptions): AgentAdapter;
  export function detectLocalProviders(): Promise<Array<{ id: string; availability: ProviderAvailability }>>;
  ```
  - On the first `status()` call, kick off async detection and return `loading`.
  - Then select the first provider whose availability is `available`. Otherwise use the first `needs-download` one, and report `needs-download{bytes}`.
  - `prepare()` downloads with progress → `downloading{progress}` → `ready`, notifying `subscribe` listeners.
  - `run()` throws a typed `error` part if the status isn't `ready`.
- **VALIDATE**: `pnpm --filter @web-agents/local-agent test`

### 12. CREATE chat UI: `AdapterSwitcher.tsx`, `DownloadCard.tsx`; UPDATE `AgentChat.tsx`

- **IMPLEMENT** (load the `components`, `states`, `a11y`, `ux-copy`, `motion` skills):
  - `AdapterSwitcher` is a segmented control (`role="radiogroup"`) in the panel header, shown only when `adapters.length > 1`. It shows each adapter's `label` plus a status dot.
    - The choice persists to `localStorage("web-agents:chat:adapter")`.
    - Switching mid-stream is disabled.
  - `DownloadCard` shows when the selected status is `needs-download`:
    - Title: "Run the assistant on this device".
    - Body: "Downloads {size} once. Nothing you type leaves your browser."
    - Buttons: **Download** and "Use cloud instead".
    - `downloading` shows a determinate progress bar (`role="progressbar"`, `aria-valuenow`) with percent and MB, plus Cancel. Abort `prepare` via its signal.
    - `error` shows Retry.
    - `unavailable` shows the reason, and the switcher option is disabled with a tooltip.
  - The composer is disabled until `ready`.
- **GOTCHA**: never auto-download. A download starts only from an explicit click (bandwidth, data caps).
- **VALIDATE**: `pnpm --filter @web-agents/chat test -- agent-chat` (extend Phase 5's browser test with a fake adapter that walks needs-download → downloading → ready)

### 13. UPDATE `apps/playground` wiring

- **IMPLEMENT**:
  - `apps/playground/package.json` adds `"@web-agents/local-agent": "workspace:*"`.
  - `vite.config.ts` adds `optimizeDeps.exclude: ["@web-agents/local-agent","@huggingface/transformers"]` and `worker: { format: "es" }`.
  - `main.tsx`: `<AgentChat adapters={[createCloudAdapter(), createLocalAdapter()]} />`.
  - Do the same in ecommerce/flights if Phase 4 is done.
- **VALIDATE**: `pnpm --filter playground build && ls apps/playground/dist/assets | grep -i worker`

### 14. UPDATE roadmap + READMEs

- **IMPLEMENT**:
  - Roadmap `@web-agents/local-agent` contract: the full `LocalAdapterOptions`, `LocalProvider`, and `AgentAdapter.subscribe?`.
  - `packages/local-agent/README.md`:
    - install;
    - Vite config recipe;
    - providers;
    - model sizes (from the verified model cards);
    - privacy statement;
    - known limits (small-model accuracy, desktop-only Prompt API).
- **VALIDATE**: `grep -n "subscribe?" .agents/plans/00-web-agents-roadmap.md`

---

## TESTING STRATEGY

All unit tests run in Vitest's **node** environment. No model is downloaded in CI.

### Unit Tests

- `tool-call-parser.test.ts`:
  - a single Qwen `<tool_call>` block;
  - two blocks;
  - prose plus a block (prose preserved in `text`);
  - `<think>` stripped, including when unterminated;
  - fenced JSON;
  - Prompt API `{type:"tool_call"}`;
  - `arguments` as a JSON string;
  - trailing-comma repair;
  - an unknown tool name gives an error and no call;
  - garbage gives the text-only result;
  - a 40 KB input is capped.
- `tools.test.ts`:
  - `compactSchema` keeps only the allowed keys;
  - `rankTools` puts `add_to_cart_tee-02` first for "add a tee" and keeps all tools when there are ≤ 8;
  - `validateArgs`: missing required, a bad enum, an integer violation, and the ok case.
- `loop.test.ts`, with a `FakeProvider` whose `generate` returns scripted results:
  - text-only gives `message-start, text-delta, finish(stop)`;
  - tool → result → text produces the right part order, and `callTool` receives the input;
  - an invalid args first attempt gets the error fed back and the second attempt is valid;
  - two invalid attempts end in an apology plus finish;
  - `maxSteps` reached gives `finish("max-steps")`;
  - abort gives `finish("aborted")`;
  - a step timeout (fake never resolves; use fake timers) gives an `error` part;
  - the streaming filter never emits `<tool_call>` text as a delta.
- `worker-protocol.test.ts`: `handleMessage` with a fake engine:
  - `init` posts progress events and then `ready`;
  - `generate` posts tokens and then `done`;
  - `abort` mid-generate stops tokens and posts `error{AbortError}`;
  - engine throw → `error`;
  - an unknown message type → `error`.
- `prompt-api.test.ts`, with stubbed `globalThis.LanguageModel`:
  - missing → unavailable;
  - each `availability()` value maps correctly;
  - `prepare` forwards `downloadprogress`;
  - native-tools detection is cached;
  - the fallback constrained JSON → `calls`;
  - throwing APIs → `unavailable` (never an uncaught error).

### Integration Tests

- Extend Phase 5's `agent-chat.browser.test.tsx` with:
  - the switcher (two fake adapters, selection persisted);
  - the download card flow;
  - the disabled composer until ready;
  - `progressbar` aria values.
- `e2e/local-model.spec.ts` (Playwright, **only when `E2E_LOCAL_MODEL=1`**, chromium with `--enable-unsafe-webgpu`):
  - open the playground;
  - choose On-device and click Download, waiting up to 10 minutes for ready;
  - send "add 1 enamel mug to the cart";
  - assert the cart badge shows 1 within 120 s.

### Edge Cases

- No WebGPU: falls back to WASM plus the 0.6B model, with a "slower on this device" note in the download card.
- Low storage: `navigator.storage.estimate()` shows less free space than the model size. Show a warning; Download is still allowed.
- The tab is hidden during a download: it continues in the worker. Progress is restored when the panel reopens, because state lives in the adapter, not the component.
- The page reloads mid-download: the partial cache is resumed or restarted cleanly, with no corrupt "available".
- The model emits a tool call for a tool that disappeared between steps: the validation error is fed back.
- The model loops calling the same tool with the same args: stop after 2 identical consecutive calls with an explanatory finish.
- Prompt API `downloadable`: Chrome manages the download. Show "Chrome is downloading its built-in model" with progress from `monitor`.
- Abort during `prepare`: the worker is terminated and the status returns to `needs-download`.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm biome ci .
pnpm turbo run typecheck --filter=@web-agents/local-agent... --filter=@web-agents/chat --filter=playground
```

### Level 2: Unit Tests

```bash
pnpm --filter @web-agents/local-agent test
```

### Level 3: Integration Tests

```bash
pnpm --filter @web-agents/chat test
pnpm turbo run build --filter=@web-agents/local-agent... --filter=playground
! grep -q "onnxruntime\|@huggingface/transformers" packages/local-agent/dist/index.mjs   # heavy deps only in worker
test -f packages/local-agent/dist/worker.mjs
ls apps/playground/dist/assets | grep -iq worker
```

### Level 4: Manual Validation

1. `pnpm --filter playground dev`. Open the Assistant, then switch to **On-device**. The download card shows the size with no network activity yet (check DevTools Network).
2. Click Download. The progress bar advances, and Cancel works (status returns to needs-download). Download again and reach ready.
3. "Add 2 logo tees to the cart". The ghost cursor types and clicks; the card goes done; the reply confirms.
4. Reload. The adapter is `ready` without re-downloading (served from cache).
5. In Chrome with the Prompt API enabled (`chrome://flags/#prompt-api-for-gemini-nano`), the On-device option uses the Prompt API (label/status) and completes the same request.
6. In Firefox or Safari without WebGPU: the WASM fallback note shows, or the option is unavailable with a reason, and the app does not crash.
7. Use `agent-browser` to capture screenshots of each state into `/tmp/phase6/`.

### Level 5: Additional Validation (Optional)

- `E2E_LOCAL_MODEL=1 pnpm --filter @web-agents/local-agent exec playwright test` on a WebGPU-capable machine.
- Run the `e2e-test` skill on the playground.

---

## ACCEPTANCE CRITERIA

- [ ] `createLocalAdapter()` implements `AgentAdapter` (with `status`, `subscribe`, `prepare`) and works in `<AgentChat adapters={[cloud, local]}>`
- [ ] Transformers.js runs in a module Worker; the main bundle doesn't include onnxruntime or transformers
- [ ] WebGPU is used when available, with a WASM fallback that uses the smaller model
- [ ] The model downloads only after explicit consent, shows determinate progress, is cancellable, and is cached across reloads
- [ ] Chrome Prompt API provider: feature-detected, with native tools when supported and JSON-constrained tool calls otherwise
- [ ] Tool calls are parsed robustly, validated against the schema, and self-corrected once; the loop is capped by `maxSteps` and per-step timeouts
- [ ] No uncaught errors in browsers without WebGPU or the Prompt API
- [ ] All Level 1–3 commands pass; manual Level 4 is done with screenshots
- [ ] Roadmap and READMEs are updated

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms the feature works
- [ ] Acceptance criteria all met
- [ ] `/code-review` and `/simplify` run; `/commit` in coherent commits

---

## NOTES

- **Why not WebLLM.** Its function calling is still marked WIP/preliminary and development has slowed. Transformers.js
  v4 has native `tools` in the text-generation pipeline and constrained output. WebLLM could be added later as a third
  `LocalProvider` without touching the loop.
- **Why a provider abstraction under one adapter.** The chat UI shows one "On-device" choice. Which engine runs it is
  an implementation detail selected by availability, so the zero-download Prompt API wins when present.
- **Accuracy expectations.** 0.6–1.7B models handle single-tool, explicit requests well and multi-step plans poorly.
  `maxSteps` defaults to 4, and tool ranking keeps the choice set small. The README must set expectations honestly.
- **Sizes.** The research numbers (~1–1.5 GB for 1–2B at q4) are estimates. Show sizes from the verified model card,
  or from a `HEAD` request.
- **Confidence: 6/10** for one-pass success. The unknowns:
  - exact transformers.js 4.3 option names (`tools`, template kwargs, stopping criteria);
  - the Qwen3 ONNX repo ids;
  - Prompt API tool/constraint support;
  - worker bundling from a dependency under Vite 8.

  Each is called out with a verification step, and the pure modules (parser, loop, protocol) are fully testable without them.
