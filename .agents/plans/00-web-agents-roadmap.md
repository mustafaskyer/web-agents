# Roadmap: `@web-agents` — WebMCP helpers, visuals, devtools and agents

Source: `TODO.md` (8 items + 1 issue + 1 priority). This file is the **single source of truth for
shared decisions and public contracts**. Every phase plan (`01-…` → `07-…`) builds against it.
If a phase needs to change a contract here, update this file in the same commit.

---

## Phase map

| # | Plan file | TODO items | Depends on | Complexity |
|---|---|---|---|---|
| 1 | `01-monorepo-core-extraction.md` | #1 monorepo, issue #1 (cursor yields to user), priority (perf/DX foundation) | — | High |
| 2 | `02-react-provider-webtool.md` | #6 context provider + `enableTools`, #7 `WebTool` API aligned with server tools | 1 | High |
| 3 | `03-devtools.md` | #3 devtools (TanStack-devtools-inspired, JSON-schema runner) | 1, 2 | Medium-High |
| 4 | `04-example-apps.md` | #2 ecommerce + flights examples | 1, 2, 3 | High |
| 5 | `05-chat-widget-cloud-agent.md` | #4 chat widget, #5 agents (cloud adapter first) | 1, 2 | High |
| 6 | `06-in-browser-agent.md` | #5 agents (in-browser adapter: transformers.js / Chrome Prompt API) | 5 | High |
| 7 | `07-vercel-deploy-ci.md` | #8 deploy to Vercel (+ CI, publishing) | 4, 5 | Medium |

Phases 3 and 5 are independent of each other and may run in parallel after Phase 2.
Phase 7's static-deploy half can run any time after Phase 4; the `/api/chat` half needs Phase 5.

Execute each phase with: `/prime` → `/execute .agents/plans/0N-….md` → `/code-review` → `/simplify` → `/commit`.

---

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| npm scope | **`@web-agents/*`** (user decision) | — |
| Monorepo | pnpm 11 workspaces + **Turborepo 2.11** | user request; pnpm already in use (`pnpm-lock.yaml`, `pnpm-workspace.yaml` exist) |
| Package split | scoped multi-package (user decision) | isolation; heavy deps (AI SDK, transformers.js) never leak into core |
| Library build | **tsdown 0.23** (Rolldown) | tsup is unmaintained ("consider tsdown instead"); with `"type": "module"` it emits `dist/*.js` + `*.d.ts` |
| Dev resolution | custom export condition **`"@web-agents/source"`** → `src/*.ts` | apps & typecheck hit source (no `^build` in dev), published package stays compiled |
| Runtime | React **19.3** + Vite **8** + `@vitejs/plugin-react` 6 in apps; packages peer `react >=18` | upgrade while restructuring; Vite 8 = Rolldown, ESM-only |
| TypeScript | **~6.0.3** (NOT 7) | TS 7 has no stable programmatic API until 7.1; breaks tooling |
| Lint/format | **Biome 2.6** at the root | one fast tool; no ESLint needed now |
| Tests | **Vitest 5** — `node` env for pure logic, **browser mode (`@vitest/browser-playwright`, chromium)** for DOM/layout/animation; **Playwright 1.65** e2e per app (Phase 4+) | jsdom has no layout, fake rAF, partial `SubmitEvent.submitter` |
| Schemas | **Standard Schema** (`@standard-schema/spec` 1.1) + Standard JSON Schema; zod 4 in examples | same contract Mastra `createTool` uses → library-agnostic |
| Agent runtime | pluggable `AgentAdapter`; first adapter = **Vercel AI SDK v7** + `@ai-sdk/anthropic`, browser executes tools | user decision; key stays server-side |
| Default model | `claude-opus-5-5` (env `WEB_AGENTS_MODEL` overrides; `claude-sonnet-5-5` for cheaper public demos) | current recommended default |
| In-browser agent | **transformers.js v4** (WebGPU or WASM, Qwen3 0.6B ONNX by default; 1.7B opt-in) in a Worker; Chrome Prompt API provider when available | WebLLM tool calling still "WIP" |
| Devtools host | standalone panel **and** optional TanStack Devtools plugin (`@tanstack/devtools` 0.16, still 0.x) | don't force TanStack on users |
| Schema form | hand-rolled ~200-line JSON-schema renderer | WebMCP schemas are shallow; RJSF ≥100 KB with ajv |
| Router (examples) | React Router 7 (data mode, `createBrowserRouter`), pinned `^7.18.5` | small; provider is router-agnostic via `pathname` (apps pass `useLocation().pathname`). 8.x exists (8.5 on 2026-11-06); not adopted in Phase 4 |
| Designs | hand-built, mirroring demo.yournextstore.com and react-flights-ui.vercel.app (no opendesign MCP connected) | user decision |
| Deploy | one Vercel project per app, Root Directory `apps/<name>`, `api/chat.ts` web-standard function | Vercel Turborepo docs |

Always confirm versions with `npm view <pkg> version` before pinning; numbers above were current on 2026-11-06.

| Package | Version |
|---|---|
| turbo / turbo-ignore | 2.11.10 |
| tsdown | 0.23.7 |
| typescript | ~6.0.3 |
| vite / @vitejs/plugin-react | 8.3.6 / 6.2.1 |
| react, react-dom / @types/react | 19.3.1 / 19.3.0 |
| vitest, @vitest/browser, @vitest/browser-playwright | 5.1.0 |
| @playwright/test | 1.65.0 |
| @biomejs/biome | 2.6.6 |
| use-webmcp-tool | 0.3.0 (repo has 0.2.0; check its changelog before bumping) |
| zod / @standard-schema/spec | 4.6.7 / 1.1.0 |
| ai / @ai-sdk/react / @ai-sdk/anthropic | 7.0.163 / 4.0.167 / 4.0.97 |
| @tanstack/devtools / @tanstack/react-devtools / @tanstack/devtools-event-client | 0.16.0 / 0.10.14 / 0.5.1 |
| @huggingface/transformers | 4.3.2 |
| hono (optional) | 4.13.16 |
| react-router | 7.x latest |

---

## Target repository layout (end state)

```
.
├── apps/
│   ├── playground/        ← today's demo (Phase 1), minimal store, every tool kind
│   ├── ecommerce/         ← YNS-style store (Phase 4)
│   └── flights/           ← react-flights-style booking (Phase 4)
├── packages/
│   ├── core/              @web-agents/core      visuals (cursor, motion, spotlight), events, WebTool, registry
│   ├── polyfill/          @web-agents/polyfill  document.modelContext polyfill (dev / non-Chrome)
│   ├── react/             @web-agents/react     <WebAgentsProvider>, useWebTool, useEnableTools, <EnableTools>, JSX attr types
│   ├── devtools/          @web-agents/devtools  panel + TanStack plugin + schema runner
│   ├── chat/              @web-agents/chat      <AgentChat>, AgentAdapter, cloud adapter, /server handler, /vite dev plugin
│   ├── local-agent/       @web-agents/local-agent  in-browser adapter (Worker + transformers.js / Prompt API)
│   └── vercel-api/        @web-agents/vercel-api (private) shared /api/chat for the apps: guard, rate limit (Phase 7)
├── .agents/plans/
├── biome.json  turbo.json  pnpm-workspace.yaml  tsconfig.base.json  vitest.config.ts  package.json
└── CLAUDE.md              ← generated with /create-rules at the end of Phase 1
```

Dependency direction (no cycles, enforced by review): `polyfill` → none; `core` → none (types only from
`@standard-schema/spec`); `react` → core; `devtools` → core (react entry → react); `chat` → core, react;
`local-agent` → chat (types only). Apps → anything.

---

## Public contracts (all phases must match these names)

### `@web-agents/core` (Phase 1 creates, Phase 2 extends)

```ts
// visuals — Phase 1
export function installAgentVisuals(options?: AgentVisualsOptions): AgentVisuals;
export interface AgentVisualsOptions {
  log?: (entry: AgentEvent) => void;        // kept for back-compat; same payloads as onAgentEvent
  linger?: number;                          // default 1200
  name?: string;                            // default ""
  sync?: boolean;                           // default true
  spotlight?: boolean | SpotlightOptions;   // default false
  yieldToUser?: boolean | YieldOptions;     // default true  (issue #1)
}
export interface YieldOptions {
  moveThreshold?: number;  // px, default 6
  resumeAfter?: number;    // ms, default 800
  ignore?: string;         // CSS selector; input inside it never yields. Default `[${UI_HOST_ATTR}]`
}
export const UI_HOST_ATTR = "data-web-agents-ui";

// tool calls from library UIs — Phase 3 creates (devtools is the first consumer), Phase 5 reuses
export interface ExecuteToolOptions { signal?: AbortSignal }
export function executeTool(name: string, args: Record<string, unknown>, opts?: ExecuteToolOptions):
  Promise<ModelContextToolResult | null>;   // getTools() lookup, Chrome 150/156 args-shape fallback, null on navigation,
                                            // abort → cancelTool?.(name) + AbortError. Done in Phase 3 (core/src/execute.ts).
export function normalizeToolResult(res: ModelContextToolResult | string): ModelContextToolResult;
export interface AgentVisuals {
  setSpotlight(spotlight: boolean | SpotlightOptions): void;
  setYieldToUser(value: boolean | YieldOptions): void;
  destroy(): void;                          // ref-counted: last destroy tears everything down
}

// events — Phase 1
export type AgentEvent =
  | { type: "start"; tool: string; at: number; args?: unknown }   // args: imperative tools only (Phase 3)
  | { type: "fill"; tool: string; field: string; value: string | boolean }
  | { type: "park"; tool: string; prompt: string }
  | { type: "result"; tool: string; result: unknown; ms: number }
  | { type: "error"; tool: string; error: string; ms: number }
  | { type: "cancel"; tool: string }
  | { type: "yield"; reason: "pointer" | "keyboard" | "wheel" | "touch" }
  | { type: "resume" };
export function onAgentEvent(listener: (e: AgentEvent) => void): () => void;
// Since Phase 3: an imperative tool with no element on screen still emits start + result/error (no animation),
// so every call through the registerTool wrapper is observable. A call that rejects with an AbortError emits `cancel`,
// never `error` (toolcancel may emit a second `cancel` for the same call; consumers ignore one with no open call).
// Events still carry no call id: consumers correlate by tool name ("newest unfinished call"). If Phase 5 needs exact
// correlation, add an optional `callId` to AgentEvent here first.

// WebTool — Phase 2  (shape is a structural superset of Mastra's createTool config)
export interface WebToolConfig<I = unknown, O = unknown> {
  id: string;                               // == WebMCP tool name, /^[a-zA-Z0-9_.-]{1,128}$/
  title?: string;
  description: string;
  inputSchema?: StandardSchemaV1<unknown, I> | JSONSchema;   // Standard Schema (zod/valibot/arktype) or plain JSON Schema
  outputSchema?: StandardSchemaV1<unknown, O>;
  annotations?: WebToolAnnotations;         // readOnlyHint, destructiveHint, idempotentHint, openWorldHint, untrustedContentHint, …
  requireConfirmation?: boolean;            // park the cursor and wait for a trusted user click on `target`; validates first;
                                            // fails closed (ConfirmationUnavailableError) when `target` is missing/disabled
  target?: string | TargetFn<I>;            // CSS selector the cursor animates to; default `[toolname="<id>"]`. A function gets
                                            // the call's arguments as sent and picks per call (a list row); invalid CSS or a
                                            // throw falls back to the default (bivariant method type: WebTool<I> fits WebTool)
  execute(input: I, ctx: WebToolContext): O | Promise<O>;
}
export interface WebToolContext {
  signal: AbortSignal;
  source: "webmcp" | "chat" | "devtools" | "test";
  toolCallId?: string;
  context?: RegisteredContext;              // app state from the provider's `context` prop / registry option
}
export interface Register {}                // augment: declare module "@web-agents/core" { interface Register { context: CartApi } }
type RegisteredContext = Register extends { context: infer C } ? C : unknown;
export interface WebTool<I = unknown, O = unknown> extends Readonly<Omit<WebToolConfig<I, O>, "execute">> {
  readonly kind: "web-tool";
  readonly jsonSchema: JSONSchema;          // input schema as JSON Schema draft-07, `$schema` stripped; lazy, memoised
  execute(input: I, ctx: WebToolContext): Promise<O>;     // always async (Mastra's execute returns a Promise)
  parse(input: unknown): Promise<I>;                      // ~standard.validate (throws WebToolInputError); JSON Schema input passes through
  run(input: unknown, ctx: WebToolContext): Promise<O>;   // parse, then execute
}
// With a Standard Schema input the result also has `inputSchema: StandardSchemaV1<unknown, I>` (assignable to Mastra's config).
export function defineWebTool<I, O>(config: WebToolConfig<I, O>): WebTool<I, O>;
export class WebToolInputError extends Error { toolId: string; issues: StandardSchemaV1.Issue[] }
export function isWebMCPAvailable(): boolean;            // feature detection for packages that may not touch document.modelContext
export function webToolSignature(tool: WebTool): string;  // what WebMCP sees; re-register iff it changes
export interface ToModelContextToolOptions {
  context?: () => unknown;                  // read per call → ctx.context
  calls?: CallTracker;                      // counts calls (confirmation wait included) so release can wait
}
export function toModelContextTool(tool: WebTool, opts?: ToModelContextToolOptions): ModelContextTool;  // errors → isError results; AbortError rethrown
export function registerWebTool(tool: WebTool, opts?: ToModelContextToolOptions & { signal?: AbortSignal }): () => void;
  // no document.modelContext → warns once, returns a no-op; re-registering an id replaces the old registration,
  // whose unregister then becomes a no-op (a stale deferred release can't remove the newer tool)

// deferred release — Phase 2 (shared by the registry and @web-agents/react)
export const RESPONSE_GRACE_MS = 500;
export function deferRelease(release: () => void, opts?: { isBusy?: () => boolean; graceMs?: number }): { cancel(): void };
export interface CallTracker { track<T>(call: () => T | Promise<T>): Promise<T>; busy(): boolean }  // busy: running or < grace since settle
export function createCallTracker(): CallTracker;
export function matchPath(pattern: string, pathname: string): boolean;   // literal, :param, trailing *, "*"
export function toToolResult(value: unknown): ModelContextToolResult;    // same rules as the polyfill
export function errorResult(err: unknown): ModelContextToolResult;
export function errorText(err: unknown): string;          // err.message or String(err) (Phase 3)
export function isAbortError(err: unknown): boolean;      // cancellation, not failure (Phase 3)

// registry — Phase 2 (framework-agnostic, ref-counted)
export function createToolRegistry(
  catalog: readonly WebTool[],
  options?: { beforeRegister?: () => void; context?: () => unknown },
): ToolRegistry;
export interface ToolRegistry {
  enable(names: readonly string[]): () => void;   // ref-counted; disposer defers unregister until in-flight calls settle + 500 ms
  update(catalog: readonly WebTool[]): void;      // re-registers only tools whose signature changed
  enabled(): readonly string[];                   // sorted, stable identity until it changes (useSyncExternalStore)
  subscribe(listener: () => void): () => void;
  destroy(): void;
}
```

### `@web-agents/polyfill` (Phase 1)

```ts
export function installWebMCPPolyfill(): ModelContext | undefined;   // no-op returning the native one if present; undefined on the server
// side-effect entry: import "@web-agents/polyfill/auto";
```

### `@web-agents/react` (Phase 2)

```tsx
<WebAgentsProvider
  tools={catalog}                         // WebTool[] — every tool the app may expose; memoise or define at module level
  context={cart}                          // reaches execute as ctx.context (typed via Register)
  global={["search_products"]}            // always enabled
  routes={{ "/product/:slug": ["add_to_cart"], "/checkout": ["place_order"] }}  // matchPath patterns: literal, :param, trailing *, "*"
  pathname={location.pathname}            // optional; defaults to window.location + Navigation API/popstate
  visuals={{ spotlight: true }}           // AgentVisualsOptions | false
>
useEnableTools(["apply_promo"]);           // enable while mounted (ref-counted)
<EnableTools names={["apply_promo"]} />    // component form
useWebTool(tool, { enabled?: boolean });   // inline tool, registered while mounted → { registered, supported }; works without a provider
useEnabledTools();                         // catalog ids registered right now
useWebAgents();                            // { registry, visuals: { setSpotlight, setYieldToUser } | null, pathname, getContext, ensureVisuals }
useOptionalWebAgents();                    // same, or null outside a provider (Phase 3; for library UI that works without one)
usePathname();                             // location.pathname via Navigation API / popstate
useToolAnswer();                           // today's useAnswerGrace, for declarative forms
useAgentEvents(listener);                  // subscribe to core events
// + JSX attribute augmentation (toolname, tooldescription, toolautosubmit, toolparamdescription)
```

### `@web-agents/devtools` (Phase 3)

```ts
export function installWebAgentsDevtools(options?: DevtoolsOptions): () => void;  // vanilla floating panel (idempotent)
export interface DevtoolsOptions {
  visuals?: Pick<AgentVisuals, "setSpotlight" | "setYieldToUser"> | null;  // React host defaults to the provider's
  initialOpen?: boolean;                    // default false
  initialSettings?: Partial<DevtoolsSettings>;  // below saved settings; pass `spotlight` matching the installed visuals
  hotkey?: string | false;                  // default "Alt+Shift+A"
  eventClient?: boolean;                    // TanStack event bus bridge (pluginId "web-agents"), default true
}
export function createDevtoolsStore(options?: DevtoolsStoreOptions): DevtoolsStore;  // useSyncExternalStore store, serialisable snapshots
export { SchemaForm, defaultValueFor, parseSchema, toAgentRunCode, toExecuteToolCode };  // reusable (Phase 5 tool cards)
export function installAgentConsole(o?): () => void;   // deprecated alias
// "@web-agents/devtools/react":   <WebAgentsDevtools {...DevtoolsOptions} />, useDevtoolsStore(options),
//                                 webAgentsDevtoolsPlugin(options) → { id: "web-agents", name: "Web Agents", render }
// peers: react, react-dom (required); @web-agents/react, @tanstack/react-devtools (optional; /react entry)
// window.agent = { run(name, args), list() } is kept for back-compat (set by the store, restored on destroy).
```

### `@web-agents/chat` (Phase 5) / `@web-agents/local-agent` (Phase 6)

```ts
export interface AgentAdapter {
  readonly id: string;
  readonly label: string;
  status?(): AdapterStatus;                               // e.g. { state: "downloading", progress: 0.42 }; may return a new object per call
  subscribe?(listener: () => void): () => void;           // status changes
  prepare?(signal?: AbortSignal): Promise<void>;          // opt-in heavy setup (model download), started by a click; abort cancels
  run(req: AgentRunRequest): AsyncIterable<AgentStreamPart>;
}
export interface AgentRunRequest {
  messages: AgentMessage[];
  readonly tools: ToolDescriptor[];                       // a getter: read it fresh before every model call (tools change with the page)
  signal: AbortSignal;
  callTool(call: { id: string; name: string; input: unknown }): Promise<ToolOutput>;  // never rejects; failures are isError results
}
// AgentPart = text | reasoning (signed thinking, sent back to the model, not rendered) | tool { id, name, input, state, output?, error?, prompt? }
// AgentStreamPart = message-start | text-delta | reasoning | tool-call | tool-result | tool-error | step-finish
//                 | finish { reason: "stop" | "max-steps" | "aborted" } | error { code?: chat_disabled | rate_limited | bad_request | network }
// <AgentChat adapter={…} /> or <AgentChat adapters={[cloud, local]} /> (switcher); title, defaultOpen, position, suggestions, storageKey, layout ("docked" default, resizable | "floating")
// createCloudAdapter({ api: "/api/chat", maxSteps: 8, headers, fetch }); useAgentSession(adapter); listToolDescriptors(); callModelContextTool()
// "@web-agents/chat/server": createChatHandler({ model, system?, effort?, maxOutputTokens?, maxSteps?, guard?, env? }): (req: Request) => Promise<Response>
//    GET → { enabled, model }; POST → one model step as an AI SDK UI message stream; 503 chat_disabled without a key;
//    guard(req) may return a Response (e.g. 429) to short-circuit; cross-site browser requests are refused (403), POST must be
//    application/json. Defaults: claude-opus-5-5, effort "low", 8192 output tokens (thinking counts), fallbacks: "default".
//    Caps in LIMITS (1 MB body, 160 messages, 48 tools, 8 KB schemas). maxSteps tool steps, then one tool-less request.
//    Only the page's same-origin path reaches the system prompt. NOT abuse protection: public deploys need a rate-limiting guard (Phase 7).
// "@web-agents/chat/vite":   webAgentsChatDev({ path?, handler? }) — mounts /api/chat in `vite dev`, key from .env files
// "@web-agents/chat/chat.css": the widget's styles (unlayered, every rule scoped by a .wa-chat* class)
// "@web-agents/local-agent" (Phase 6): createLocalAdapter({ providers?, model?, worker?: Worker | (() => Worker), maxSteps = 4,
//    stepTimeoutMs = 60_000, label = "On-device" }) → AgentAdapter with status/subscribe/prepare(signal). Providers, first
//    available wins: createPromptApiProvider() (Chrome LanguageModel, JSON-constrained tool calls), then
//    createTransformersProvider({ model?, dtype?, worker? }) (Qwen3 0.6B: q4f16 on WebGPU ~585 MB, q4 on WASM ~934 MB;
//    1.7B is opt-in — its 1.4 GB session ran out of WASM memory in testing).
//    LocalProvider { id, label, toolsInline?, availability(), prepare(onProgress, signal?), generate({ system, messages,
//    tools, signal, onToken }), dispose?() }. detectLocalProviders(). Apps: optimizeDeps.exclude + worker.format "es".
// AdapterStatus "needs-download" carries an optional `note` (shown in the download card); <AgentChat adapters> shows a
// radio-group switcher (choice in localStorage "web-agents:chat:adapter") and a consent-first download card.
```

---

### Shared UI convention (Phases 1, 3, 5)

Every UI the libraries inject (devtools panel, chat widget) has a host element with the `data-web-agents-ui`
attribute. `user-yield.ts` ignores input whose `composedPath()` contains such a host. Otherwise clicking *Run* in
devtools or typing in the chat would hide the agent cursor the user just asked for.
Floating UIs render in a shadow root at `z-index: calc(var(--agent-z) + 100)`, above the spotlight. In-place UIs
(a host with a size, e.g. the devtools tab inside TanStack Devtools) are cut out of the spotlight by the cursor (Phase 3).
Library UIs call tools through core's `executeTool()`, never `document.modelContext.executeTool` directly.

## Quality bar (TODO "priorities": performance, animation, UI/UX, DX) — applies to every phase

- **Performance budgets** (`pnpm --filter @web-agents/core size`, part of `pnpm check`; Vite/Rolldown minify + gzip -9,
  measured through a re-export so tree-shaking applies): **visuals-only import (`installAgentVisuals`, `onAgentEvent`)
  ≤ 9 KB min+gz** (8.96 KB after Phase 3: only ~0.04 KB of headroom left) and **whole package ≤ 13 KB** (12.4 KB after Phase 3).
  Decision (Phase 3): no `@web-agents/core/tools` split. Consumers bundle with tree-shaking, so a subpath would not
  shrink what a visuals-only page pays, and it would churn every import for no gain. The per-import budget keeps the
  cursor lean; the whole-package budget caps WebTool/registry/executeTool growth. Revisit if a non-bundled (CDN) build ships;
  no work when idle (rAF loop stops, no polling while the tab is hidden); per-frame DOM reads happen before writes;
  INP unaffected (all listeners `passive`, capture-phase work O(1)).
- **Animation**: transforms/opacity only; spring/minimum-jerk motion stays in `motion.ts`; every new animation has a
  `prefers-reduced-motion` branch. Load the `motion` and `interaction` skills before touching visuals.
- **UI/UX**: every screen covers loading/empty/error/streaming states (`states` skill); `a11y` skill pass on every
  widget (keyboard, focus, live regions); `ux-copy` for all interface text; `polish` before a phase is closed.
- **DX**: one-line install per package, typed options with TSDoc, zero-config defaults, `pnpm dev` starts everything,
  errors name the fix ("call installAgentVisuals() before your app renders").

## Skills & commands per phase

| Phase | Before | During | After |
|---|---|---|---|
| all | `/prime` | `/execute <plan>` | `/code-review`, `/simplify`, `/commit` |
| 1 | — | `motion`, `interaction` (yield-to-user) | `/create-rules` (writes CLAUDE.md), `agent-browser` smoke test |
| 2 | — | `components` (provider/hook API) | `react-doctor` |
| 3 | `stealth` | `components`, `interaction`, `a11y`, `type`, `space`, `dataviz` (timeline) | `react-doctor`, `agent-browser` |
| 4 | `stealth` | `type`, `surface`, `space`, `states`, `mobile-feel`, `ux-copy` | `e2e-test`, `polish` |
| 5 | `claude-api` | `components`, `states`, `a11y`, `ux-copy`, `motion` | `security-review`, `e2e-test` |
| 6 | — | `states` (download progress) | `e2e-test` |
| 7 | — | (Vercel docs) | `security-review`, `agent-browser` against the preview URLs |

## Risks

- WebMCP is an origin-trial API: event targets, `executeTool` arg shapes and `getTools()` fields keep moving. The
  polyfill and the feature detection in `core` absorb it; never call `document.modelContext` outside core/polyfill/devtools/chat.
- tsdown CSS handling is experimental → core ships `cursor.css` as a copied asset, not a bundled import.
- TanStack Devtools is 0.x → plugin lives in a separate entry; the standalone panel is the primary surface.
- A public demo with an Anthropic key needs rate limiting, token caps and an origin check. Done in Phase 7:
  `@web-agents/vercel-api` (private) — `createVercelChatRoute({ app, env?, model? })` → `{ GET, POST, OPTIONS }`;
  `guard`: `originGuard()` (POST needs the request's own Origin) + `rateLimitGuard` (per IP, 30/min + 300/day, 429 with
  retry-after); `beforeModel`: `budgetGuard` (3000 model calls/day → 503 `{error:"unavailable",reason:"daily_budget"}`,
  storage down → `reason:"busy"`). Upstash Redis when `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` exist (errors and
  timeouts: per-IP fails open, budget fails closed), else in-memory. Public demos: claude-sonnet-5-5, 4096 output tokens,
  6 steps. Chat contract additions: `ChatHandlerOptions.beforeModel` (after validation, before the model); the cloud
  adapter only disables itself on `chat_disabled`, other 503s/429s are passing errors. Deploy steps and env table: docs/deploy.md. CI: .github/workflows/ci.yml; releases:
  Changesets (six public packages `fixed`) + release.yml (npm provenance). Not done without the maintainer: Vercel
  link/deploy/env, Upstash, NPM_TOKEN / npm scope, pushing.
- Top layer: elements opened with `showModal()` / popover render above any z-index, so the cursor overlay
  (`--agent-z` on `body`) would disappear under a modal drawer, and the devtools panel would be inert behind it.
  Decision (Phase 4): the example apps use non-modal panels (`role="dialog"` + `aria-modal`, the page behind
  made `inert`, Escape and focus return handled in the app); core is unchanged (the cursor budget has ~0.04 KB left).
  Revisit in core (`popover="manual"` overlay re-shown after a dialog opens) if a real app needs `showModal()`.
- Per-row tools animate to the exact row: `target` may be a function of the call's arguments (done; used by
  `browse_category`, `update_cart_item`, `remove_from_cart`, `select_flight`).
- The polyfill types radio groups as plain strings, so the examples use `<select>` for enums. It now adds `format`
  (`email`, `date`, `uri`) for those input types, and devtools fills them with samples. Follow-up (polyfill): `enum`
  for radio groups.
- The polyfill dispatches an agent's submit without `checkValidity()`, so `required` fields aren't enforced for
  agents; the examples check in the submit handler (`CheckoutForm`). Follow-up (polyfill): validate before an agent
  submit and answer `Error: …`, after checking what native Chrome does.
- "Answer, then navigate / close after the grace" is duplicated in both examples (`apps/*/src/lib/afterAnswer.ts`).
  Follow-up (react, additive): `useToolAnswer().answer(event, result, { then })` or an exported `afterAnswer`.
- The examples load the polyfill in dev only; deployed demos show no tools without native WebMCP. Phase 7 decides
  whether to ship it (`VITE_WEBMCP_POLYFILL`). Phase 5 mounted `<AgentChat />` in all three apps (bottom-left in dev, opposite the devtools; bottom-right in prod).
- The open chat panel sits in a corner and can cover the control a confirm-gated tool waits on ("Show me" scrolls it
  into view but doesn't move the panel). Follow-up: collapse or shift the panel while a card is awaiting confirmation.
- In-browser models: 0.6–0.9 GB downloads by default (done in Phase 6: opt-in card, determinate progress, Cancel, Cache API +
  `navigator.storage.persist()`). The build also emits ONNX Runtime's ~27 MB WASM as a static asset (fetched only after
  Download). Small models are weak at multi-step plans: the local adapter caps steps at 4 and ranks ≤ 8 tools.
