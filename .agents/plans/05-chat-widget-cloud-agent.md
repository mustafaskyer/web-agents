# Feature: Chat widget + cloud agent adapter (`@web-agents/chat`), Phase 5

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Before anything else: load the `claude-api` skill** (model ids, AI SDK/Anthropic provider facts). Then read
`.agents/plans/00-web-agents-roadmap.md`. It is the source of truth for every public name used below.

## Feature Description

A drop-in chat widget that lets an end user talk to an agent, and the agent operates the **live page** through the
page's WebMCP tools (`document.modelContext`). The model runs in the cloud (Claude via Vercel AI SDK v7), and the
API key stays on the server. **Tools always execute in the browser**, through `document.modelContext.executeTool`,
so `@web-agents/core` visuals (ghost cursor, field typing, the confirmation park) play exactly as they do for any
other agent. The agent runtime is pluggable (`AgentAdapter`). This phase ships the cloud adapter; Phase 6 adds an
in-browser one behind the same interface.

Deliverables:
- `@web-agents/chat` (React): `<AgentChat>`, `AgentAdapter` types, `createCloudAdapter()`, `callModelContextTool()`.
- `@web-agents/chat/server`: `createChatHandler()`, a web-standard `(req: Request) => Promise<Response>`.
- `@web-agents/chat/vite`: `webAgentsChatDev()`, a Vite plugin that serves `/api/chat` during `vite dev`.
- Wired into `apps/playground`, and into `apps/ecommerce` / `apps/flights` if Phase 4 has landed.

## User Story

As a visitor of a WebMCP-enabled site
I want to ask an assistant in plain language ("add two logo tees and apply my promo")
So that the site does it for me while I watch it happen and confirm anything consequential

As a developer using `@web-agents`
I want to add `<AgentChat adapter={createCloudAdapter()} />` and one server route
So that my existing WebMCP tools become chat-drivable with no per-tool glue code

## Problem Statement

Today the only "agent" is the dev console (`dev/agent-console.ts`, moved to `packages/devtools/src/console.ts` in
Phase 1), which calls tools with hand-written JSON. Nothing lets a real LLM discover the page's tools, call them
in a loop, and report back in conversation. Wiring that by hand means solving each of these:
- A server route that never exposes the key.
- Tool schemas sent per request, because the page's tools change with route and state.
- Client-side tool execution.
- Navigation mid-call.
- Confirmation pauses.
- Streaming UI.
- Abuse limits.

## Solution Statement

1. **Contract first.** `AgentAdapter.run(req)` returns `AsyncIterable<AgentStreamPart>`. The adapter owns the
   model↔tool loop and calls `req.callTool()` for each tool call. The widget is a pure consumer of stream parts.
   The Phase 6 local adapter therefore plugs in unchanged.
2. **Cloud adapter drives the HTTP loop itself.** It does not use `useChat`. AI SDK is used only for the **wire
   protocol**: `streamText` + `toUIMessageStream` + `createUIMessageStreamResponse` on the server, and
   `readUIMessageStream` on the client. Justification:
   - `useChat` is a React hook that owns message state. Our widget state must be adapter-agnostic, and the local
     adapter has no HTTP at all.
   - `onToolCall` + `addToolOutput` + `sendAutomaticallyWhen` re-implement the exact loop we need, but spread over
     hook callbacks. `onToolCall` must not be awaited (the docs warn about deadlocks), which makes cancellation and
     the "parked awaiting confirmation" state awkward.
   - A ~150-line explicit loop behind `run()` is easy to test against the real handler in Node, because `fetch` can
     be stubbed with `handler(new Request(…))`.
3. **Tools are sent per request** from `document.modelContext.getTools()`. They become server-side tools declared
   with `jsonSchema()` and **no `execute`**, so the model's tool calls stream to the client and the request ends.
   The client runs them, appends outputs, and POSTs again until no tool calls are left or `maxSteps` is reached.
4. **Confirmation state comes from core events.** `onAgentEvent` emits `{ type: "park" }` when the browser pauses
   for the user. The widget maps it onto the running tool card as "Waiting for you: click *Place order*".
5. **Server handler hardening.** It validates the payload (counts, sizes, names), caps output tokens, injects a
   system prompt about acting on a live page and confirmations, and returns 503 `chat_disabled` when no key is
   configured.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**:
- `packages/chat` (new)
- `packages/core` (small additions: `executeTool` helper export, yield-ignore selector)
- `apps/playground` (wiring)
- `.agents/plans/00-web-agents-roadmap.md` (contract additions)

**Dependencies**:
- `ai` ^7.0.163
- `@ai-sdk/anthropic` ^4.0.97 (server, optional peer)
- `react` >=18 (peer)
- `vite` ^8 (optional peer, for `/vite` only)
- `zod` ^4.6.7 (server payload validation)
- dev: `vitest-browser-react` (verify name/version), `@vitest/browser-playwright`

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

Paths are post-Phase-1. If a file still lives at its pre-Phase-1 path, the original path is given in parentheses.

- `.agents/plans/00-web-agents-roadmap.md` ("Public contracts → `@web-agents/chat`", "Quality bar", "Skills & commands"). Why: the exact names `AgentAdapter`, `AgentRunRequest`, `createCloudAdapter`, `createChatHandler`, `webAgentsChatDev`.
- `packages/devtools/src/console.ts` (was `dev/agent-console.ts`):
  - lines 40-53 `normalizeResult`. Why: Chrome resolves `executeTool` to a JSON **string**, the polyfill to `{content,isError}`. Mirror it exactly.
  - lines 122-142 `argsAs` + `execute()`. Why: the args-shape fallback (Chrome 156 wants an object, 150 a JSON string). Retry only on the arg-validation error.
  - lines 144-169 `announcePause`. Why: how a paused (non-autosubmit) tool is detected (`:tool-submit-active` / `[data-tool-submit-active]`).
  - lines 171-194 `run()`. Why: the "Error:" prefix convention (declarative tools can't set `isError`).
- `packages/polyfill/src/index.ts` (was `dev/webmcp-polyfill.ts`):
  - lines 64-90 `executeTool`. Why: accepts `(name|tool, object|string)`; emits `toolactivated`; returns `{content,isError}`.
  - lines 92-98 `cancelTool`. Why: non-standard; the only way to cancel in the polyfill.
- `packages/core/src/events.ts` (Phase 1). Why: `onAgentEvent`, `AgentEvent` (`start`/`park`/`result`/`error`/`cancel`/`yield`/`resume`). The widget subscribes for tool-card state.
- `packages/core/src/user-yield.ts` (Phase 1). Why: trusted keyboard/pointer input hides the cursor. **Typing into the chat composer must NOT count** (see Task 2).
- `packages/core/src/visuals.ts` (was `src/agent-visuals/index.ts`):
  - lines 263-318. Why: the `toolactivated` → fill → park flow. `park` is what the widget surfaces.
  - lines 435-480 `runGated`. Why: imperative tools are held until the cursor clicks. Expect 0.5–2.5 s per tool call.
- `packages/core/src/cursor.css` lines 1-15 (`--agent-z: 2147483000`). Why: z-index stacking. The chat panel must sit **above the spotlight overlay and below the cursor**. Check the `.agent-spotlight` z-index in this file.
- `packages/core/src/webmcp.ts` (was `src/types/webmcp.d.ts`):
  - lines 16-44 `ModelContextToolInfo`, `ModelContextToolResult`.
  - lines 55-85 `executeTool` overloads. Why: the types `callModelContextTool` builds on.
- `apps/playground/src/store.tsx` lines 129-138 (`settle`, `errorMessage`). Why: results prefixed `Error:` are failures.
- `apps/playground/src/main.tsx`. Why: where the widget and the dev plugin get wired (Tasks 15-16).
- `packages/devtools/package.json` + `tsdown.config.ts` (Phase 1/3). Why: **MIRROR** the package.json `exports` with the `"@web-agents/source"` condition, the scripts, and the tsdown config for a multi-entry React package.

### New Files to Create

```
packages/chat/
  package.json                     exports ".", "./server", "./vite", "./chat.css"
  tsconfig.json                    extends ../../tsconfig.base.json
  tsdown.config.ts                 entries: src/index.ts, src/server/index.ts, src/vite/index.ts; copy chat.css
  vitest.config.ts                 two projects: "chat:node" (server, adapter, vite) and "chat:browser" (components)
  README.md
  src/index.ts                     public client exports
  src/types.ts                     AgentAdapter, AgentRunRequest, AgentMessage, AgentPart, AgentStreamPart, ToolDescriptor, ToolOutput, AdapterStatus
  src/tools.ts                     listToolDescriptors(), callModelContextTool()
  src/adapter/cloud.ts             createCloudAdapter()
  src/adapter/wire.ts              AgentMessage[] <-> UIMessage[] conversion, UIMessage snapshot -> AgentStreamPart diffing
  src/session/use-agent-session.ts reducer + hook: messages, status, send, stop, retry
  src/session/reducer.ts           pure reducer (node-testable)
  src/components/AgentChat.tsx     launcher + panel shell, portal, open state, keyboard
  src/components/MessageList.tsx
  src/components/ToolCallCard.tsx
  src/components/Composer.tsx
  src/components/Suggestions.tsx
  src/chat.css                     scoped styles (`.wa-chat` prefix, @layer web-agents)
  src/server/index.ts              createChatHandler, types
  src/server/handler.ts
  src/server/validate.ts           zod schemas for the request body
  src/server/system-prompt.ts
  src/vite/index.ts                webAgentsChatDev()
  src/vite/node-bridge.ts          IncomingMessage -> Request, Response -> ServerResponse
  test/
    reducer.test.ts                node
    wire.test.ts                   node
    handler.test.ts                node, mock model
    cloud-adapter.test.ts          node, fetch -> real handler + mock model
    tools.test.ts                  browser (polyfill + fixture form)
    vite-plugin.test.ts            node
    agent-chat.browser.test.tsx    browser, fake adapter
apps/playground/.env.example       ANTHROPIC_API_KEY=, WEB_AGENTS_MODEL=
```

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

AI SDK v7:
- [Chatbot tool usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage#example): the client-side tool flow, `addToolOutput`, `output-error` (#error-handling). Why: the semantics we replicate in the adapter loop.
- [Tools and tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#dynamic-tools): `tool()` and `dynamicTool()`; leaving out `execute` makes a client-side tool.
- [jsonSchema()](https://ai-sdk.dev/docs/reference/ai-sdk-core/json-schema). Why: tools arrive as plain JSON Schema.
- [Migration guide 7.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0). Why: the v7 renames:
  - `isStepCount` (was `stepCountIs`)
  - `result.stream` (was `fullStream`)
  - `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`
  - `addToolOutput`
  - `convertToModelMessages` is async
  - Node 22+ required
- [UI message stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol#ui-message-stream-protocol). Why: the SSE wire format the adapter parses.
- [readUIMessageStream](https://ai-sdk.dev/docs/reference/ai-sdk-ui/read-ui-message-stream). Why: client parsing into `UIMessage` snapshots. Verify the export name and signature in the installed `ai`.
- [Testing](https://ai-sdk.dev/docs/ai-sdk-core/testing). Why: the mock language model (`MockLanguageModelV3` in v5/v6; **verify the v7 name** with `grep -o "MockLanguageModelV[0-9]" node_modules/ai/dist/test/index.d.mts`) and `simulateReadableStream`.
- [Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic). Why: `anthropic(modelId)`, `createAnthropic({ apiKey })`, reads `ANTHROPIC_API_KEY`.

Platform:
- [Chrome WebMCP imperative API: discover tools](https://developer.chrome.com/docs/ai/webmcp/imperative-api#discover-tools). Why: the `getTools()` fields, and `executeTool` resolving to `null` on navigation.
- [Vite plugin API: configureServer](https://vite.dev/guide/api-plugin#configureserver) and [loadEnv](https://vite.dev/guide/api-javascript#loadenv). Why: the dev middleware, and reading the non-`VITE_` key server-side.
- [Node `Readable.toWeb` / `Readable.fromWeb`](https://nodejs.org/api/stream.html#streamreadabletowebstreamreadable-options). Why: the node-bridge.
- [WAI-ARIA dialog (non-modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [log role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/log_role). Why: panel semantics and the streaming message log.

### Patterns to Follow

**Result normalization.** Copy verbatim from `packages/devtools/src/console.ts:40-53`:
```ts
/** Chrome resolves to a JSON string; the polyfill to { content, isError }. */
function normalizeResult(res: ModelContextToolResult | string): ModelContextToolResult {
  if (typeof res !== "string") return res;
  let value: unknown = res;
  try { value = JSON.parse(res); } catch { /* plain text */ }
  if (value && typeof value === "object" && Array.isArray((value as ModelContextToolResult).content)) {
    return value as ModelContextToolResult;
  }
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }] };
}
```

**Args-shape fallback.** From `console.ts:128-142`. Retry ONLY on the validation error, then remember the shape:
```ts
let argsAs: "object" | "string" = "object";
async function execute(tool: ModelContextToolInfo, args: Record<string, unknown>) {
  const call = (shape: typeof argsAs) => mc!.executeTool(tool, shape === "object" ? args : JSON.stringify(args));
  try { return await call(argsAs); } catch (err) {
    const message = String((err as Error)?.message ?? err);
    const other = argsAs === "object" ? "string" : "object";
    const wrongShape = argsAs === "object" ? /parse input string as JSON|not of type 'DOMString'/i : /not an object|invalid input object/i;
    if (!wrongShape.test(message)) throw err;
    argsAs = other;
    return call(argsAs);
  }
}
```

**Failure detection.** From `console.ts:186-187`:
```ts
// Declarative tools can't set isError; this demo's handlers prefix failures with "Error:".
const failed = res.isError || /^Error:/.test(text);
```

**Code style** (read any Phase 1 file):
- File-header doc comment explaining the "why".
- `const` arrow helpers.
- Named exports only.
- TSDoc on every public option.
- No default exports, except React components where the package already uses them (it doesn't; keep named).
- Error messages name the fix, e.g. `"No document.modelContext: install @web-agents/polyfill or use Chrome with WebMCP enabled"`.

**Naming:**
- CSS classes are `wa-chat__*` (BEM-ish, mirroring the `agent-cursor__arrow` style in `cursor.css`).
- `data-state="open|closed"` and `data-status="running|awaiting|done|error"` are the styling hooks (the `components` skill: style through data attributes).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

- Scaffold `packages/chat` by mirroring `packages/devtools`. Add the contract types.
- Move the WebMCP call helpers into core (shared with devtools). Add a yield-ignore selector to core.

### Phase 2: Core Implementation

- Server: payload validation, system prompt, `createChatHandler`.
- Client: wire conversion, `createCloudAdapter` loop, `callModelContextTool`.
- Session reducer + hook. Components.

### Phase 3: Integration

- Vite dev plugin. Playground wiring (`.env.example`, `vite.config.ts`, `main.tsx`).
- Update the roadmap contract (the `adapters` prop and the core additions).

### Phase 4: Testing & Validation

- Node tests: reducer, wire, handler, and adapter end-to-end against the real handler with a mock model.
- Browser tests: tool execution through the polyfill, and the widget with a fake adapter.
- Manual: real Claude in the playground via `agent-browser`. Then `security-review`.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 1. CREATE `packages/chat` scaffold (package.json, tsconfig, tsdown, vitest, README stub)

- **IMPLEMENT**: package.json:
  ```json
  {
    "name": "@web-agents/chat", "version": "0.0.0", "type": "module",
    "sideEffects": ["**/*.css"],
    "exports": {
      ".":         { "@web-agents/source": "./src/index.ts",        "types": "./dist/index.d.mts",        "import": "./dist/index.mjs" },
      "./server":  { "@web-agents/source": "./src/server/index.ts", "types": "./dist/server/index.d.mts", "import": "./dist/server/index.mjs" },
      "./vite":    { "@web-agents/source": "./src/vite/index.ts",   "types": "./dist/vite/index.d.mts",   "import": "./dist/vite/index.mjs" },
      "./chat.css":{ "@web-agents/source": "./src/chat.css", "default": "./dist/chat.css" },
      "./package.json": "./package.json"
    },
    "files": ["dist"],
    "scripts": { "build": "tsdown", "dev": "tsdown --watch", "typecheck": "tsc --noEmit", "test": "vitest run" },
    "dependencies": { "@web-agents/core": "workspace:*", "ai": "^7.0.163", "zod": "^4.6.7" },
    "peerDependencies": { "react": ">=18", "react-dom": ">=18", "@ai-sdk/anthropic": "^4", "vite": ">=6" },
    "peerDependenciesMeta": { "@ai-sdk/anthropic": { "optional": true }, "vite": { "optional": true } },
    "devDependencies": { "@ai-sdk/anthropic": "^4.0.97", "vite": "^8.3.6", "react": "^19.3.1", "react-dom": "^19.3.1", "@types/react": "^19.3.0", "@types/react-dom": "^19.3.0", "vitest-browser-react": "<verify>" }
  }
  ```
  - tsdown config: `entry: { index: "src/index.ts", "server/index": "src/server/index.ts", "vite/index": "src/vite/index.ts" }`, `format: "esm"`, `dts: true`, `external: [/^react/, /^ai/, /^@ai-sdk\//, "vite", /^node:/]`, copy `src/chat.css` → `dist/chat.css`.
  - The server and vite entries are `platform: "node"`; the index entry is browser. If tsdown can't mix platforms in one config, export an array of two configs.
- **PATTERN**: `packages/devtools/package.json` and `packages/devtools/tsdown.config.ts` (Phase 3).
- **GOTCHA**:
  - `@ai-sdk/anthropic` must never reach the client bundle. Only `src/server/**` may import it. Add a Biome `noRestrictedImports` override for `packages/chat/src/{components,adapter,session}/**` banning `@ai-sdk/anthropic` and `node:*`.
  - Verify the `vitest-browser-react` package name and version with `npm view vitest-browser-react version`.
- **VALIDATE**: `pnpm install && pnpm --filter @web-agents/chat typecheck`

### 2. UPDATE `packages/core`: shared tool-call helpers + yield-ignore selector

- **IMPLEMENT**:
  - (a) If `packages/core/src/webmcp.ts` does not already export `executeTool` / `normalizeToolResult` (Phase 3 may have moved them), add both:
    - `export async function executeTool(name: string, args: Record<string, unknown>, opts?: { signal?: AbortSignal }): Promise<ModelContextToolResult | null>`. It looks the tool up via `getTools()`, applies the args-shape fallback, and normalizes the result.
    - `null` passes through when the page navigates (Chrome resolves `executeTool` to `null`).
    - On `signal` abort it calls `document.modelContext.cancelTool?.(name)` and rejects with `AbortError`.
    - Switch `packages/devtools/src/console.ts` to import these. Delete its copies.
  - (b) `YieldOptions.ignore?: string`, a CSS selector, default `"[data-web-agents-ui]"`. In `user-yield.ts`, skip any trusted event whose `event.target` (use `composedPath()[0]`) is inside `closest(ignore)`.
- **PATTERN**: `console.ts:40-53,128-142`; Phase 1 `user-yield.ts` listener structure.
- **GOTCHA**:
  - Without (b), pressing Enter in the composer marks the user "active". The first tool call then starts inside `resumeAfter` (800 ms) and plays with no cursor, which is the exact bug issue #1 tried to avoid in reverse.
  - The devtools panel should also carry `data-web-agents-ui`. Note it in the devtools README if Phase 3 did not.
- **VALIDATE**: `pnpm --filter @web-agents/core test && pnpm --filter @web-agents/devtools typecheck`

### 3. CREATE `packages/chat/src/types.ts`

- **IMPLEMENT** (exact names, matching the roadmap):
  ```ts
  export interface ToolDescriptor { name: string; description: string; inputSchema: JSONSchema }
  export type ToolOutput = ModelContextToolResult;                       // { content, isError? }
  export type AdapterStatus =
    | { state: "ready" } | { state: "unavailable"; reason: string }
    | { state: "needs-download"; bytes?: number } | { state: "downloading"; progress: number }
    | { state: "loading" } | { state: "error"; error: string };
  export type ToolCallState = "running" | "awaiting-confirmation" | "done" | "error" | "cancelled";
  export type AgentPart =
    | { type: "text"; text: string }
    | { type: "tool"; id: string; name: string; input: unknown; state: ToolCallState; output?: ToolOutput; error?: string; prompt?: string };
  export interface AgentMessage { id: string; role: "user" | "assistant"; parts: AgentPart[] }
  export type AgentStreamPart =
    | { type: "message-start"; messageId: string }
    | { type: "text-delta"; messageId: string; delta: string }
    | { type: "tool-call"; messageId: string; id: string; name: string; input: unknown }
    | { type: "tool-result"; id: string; output: ToolOutput }
    | { type: "tool-error"; id: string; error: string }
    | { type: "step-finish"; step: number }
    | { type: "finish"; reason: "stop" | "max-steps" | "aborted" }
    | { type: "error"; error: string; code?: "chat_disabled" | "rate_limited" | "bad_request" | "network" };
  export interface AgentRunRequest {
    messages: AgentMessage[]; tools: ToolDescriptor[]; signal: AbortSignal;
    callTool(call: { id: string; name: string; input: unknown }): Promise<ToolOutput>;
  }
  export interface AgentAdapter { readonly id: string; readonly label: string; status?(): AdapterStatus; prepare?(): Promise<void>; run(req: AgentRunRequest): AsyncIterable<AgentStreamPart> }
  ```
  `prepare?()` is the opt-in download hook Phase 6 needs. Add it to the roadmap in Task 17.
- **IMPORTS**: `JSONSchema` and `ModelContextToolResult` from `@web-agents/core` (Phase 1 exports them from `webmcp.ts`).
- **VALIDATE**: `pnpm --filter @web-agents/chat typecheck`

### 4. CREATE `packages/chat/src/server/validate.ts` + `system-prompt.ts`

- **IMPLEMENT**:
  - Zod body schema:
    - `messages`: max 60 items. Each item is `{ id: string ≤64, role: "user"|"assistant", parts: [...] }`, max 40 parts. A part is either `{type:"text", text ≤ 8000}` or a tool part `{type:"tool", id, name, input, state, output?, error?}`.
    - `tools`: max 48 items. `name` matches `/^[a-zA-Z0-9_.-]{1,128}$/`, `description` ≤ 1024, `inputSchema` a record. Enforce `JSON.stringify(inputSchema).length ≤ 8192` via `.refine`.
    - Unique tool names.
    - Total raw body ≤ 256 KB. Check `content-length` AND the actual text length before `JSON.parse`.
  - `sanitizeSchema(s)` deletes `$schema` and `$id` and guarantees `type: "object"` at the root.
  - `system-prompt.ts` exports `DEFAULT_SYSTEM_PROMPT`. Content:
    - You act on the live web page the user is looking at, through the provided tools.
    - Tools change as the page changes; only call tools listed in this request.
    - Some tools pause for the user to confirm on the page (orders, payments, deletions). When a result says it is waiting or was cancelled, tell the user what to click; never claim it succeeded.
    - A result starting with "Error:" is a failure; explain it and suggest a fix.
    - Ask before consequential actions the user did not explicitly request.
    - Keep replies short; the user can see the page change.
    - Never invent tool names or arguments; ask for missing values.
  - `buildSystemPrompt({ base, pageTitle?, url? })` appends a "Current page:" line when the client provides it.
- **GOTCHA**:
  - Tool descriptions are page-supplied text, so treat them as untrusted. Do not concatenate them into the system prompt; they only go in the tool definitions. Strip control characters.
  - Validate `url` as same-origin with the request `Origin` header when both are present.
- **VALIDATE**: `pnpm --filter @web-agents/chat test -- validate`

### 5. CREATE `packages/chat/src/server/handler.ts` + `index.ts`

- **IMPLEMENT**:
  ```ts
  export interface ChatHandlerOptions {
    /** A LanguageModel instance, or a model id for @ai-sdk/anthropic. Default: env WEB_AGENTS_MODEL ?? "claude-opus-5-5". */
    model?: LanguageModel | string;
    system?: string;                      // default DEFAULT_SYSTEM_PROMPT
    maxOutputTokens?: number;             // default 1024
    /** Max assistant tool round-trips per conversation turn; requests beyond it get a final no-tools answer. Default 8. */
    maxSteps?: number;
    /** Runs first; return a Response to short-circuit (rate limit, origin check). Phase 7 uses it. */
    guard?: (req: Request) => Promise<Response | undefined> | Response | undefined;
    env?: Record<string, string | undefined>;   // default process.env
  }
  export function createChatHandler(opts?: ChatHandlerOptions): (req: Request) => Promise<Response>;
  ```
  Request flow:
  - `GET` returns `{ enabled: boolean, model: string }`, so the widget can show "Chat is offline" without sending.
  - `OPTIONS` returns 204.
  - Any other method returns 405.
  - `POST`:
    1. Run `guard`.
    2. If there is no `ANTHROPIC_API_KEY` and `model` is not an instance, return 503 `{error:"chat_disabled"}`.
    3. Validate the body; on failure return 400 `{error:"bad_request", issues}`.
    4. Convert `AgentMessage[]` → `UIMessage[]` via `toUIMessages()` from `../adapter/wire.ts`. That file must have no DOM imports; keep it pure.
    5. Build `tools = Object.fromEntries(body.tools.map(t => [t.name, { description: t.description, inputSchema: jsonSchema(sanitizeSchema(t.inputSchema)) }]))`. No `execute`.
    6. Count the trailing assistant tool steps since the last user message. If `≥ maxSteps`, pass `tools: {}` and append a system note: "Tool budget reached; summarize."
    7. Call `streamText({ model, system, messages: await convertToModelMessages(ui), tools, maxOutputTokens, abortSignal: req.signal, stopWhen: isStepCount(1) })`.
    8. `return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`.
  - Errors from the provider become one UI-stream `error` chunk. Never leak the key or a stack trace. Log `console.error` server-side.
- **IMPORTS**: `streamText, convertToModelMessages, jsonSchema, isStepCount, toUIMessageStream, createUIMessageStreamResponse, type LanguageModel, type UIMessage` from `"ai"`; `createAnthropic` from `"@ai-sdk/anthropic"`. Use a dynamic `await import("@ai-sdk/anthropic")` only when `model` is a string, so tests with a mock never need the provider.
- **GOTCHA**:
  - Verify every v7 export name against `node_modules/ai/dist/index.d.mts` before writing. The research flagged `toUIMessageStreamResponse` as deprecated, and `fullStream` became `stream`.
  - `convertToModelMessages` is **async** in v7.
  - Tool parts in `UIMessage` are typed `tool-${name}` for static tools and `dynamic-tool` for dynamic ones. Use whichever `convertToModelMessages` accepts for tools declared at request time. Write a unit test that round-trips one tool call and fix `wire.ts` to match.
  - The function must work on Node 22+ (Vercel) and in `vite dev` (Node 24).
- **VALIDATE**: `pnpm --filter @web-agents/chat test -- handler`

### 6. CREATE `packages/chat/src/adapter/wire.ts`

- **IMPLEMENT**:
  - `toUIMessages(messages: AgentMessage[]): UIMessage[]`. Text parts map to `{type:"text", text}`. A tool part maps to the AI SDK tool part shape:
    - `state: "output-available"` with `output` when it is done or errored, using `errorText` + `"output-error"` for errors.
    - `"input-available"` when it is still pending; this should not occur on send.
    - Cancelled tools map to `output-error` with `errorText: "Cancelled by the user"`.
  - `async function* readParts(stream: ReadableStream<Uint8Array>, messageId)`. Use `readUIMessageStream` (or the current parser) to get accumulating `UIMessage` snapshots, and **diff** them into `AgentStreamPart`s:
    - New text appends `text-delta` with only the new suffix.
    - A tool part whose input just became available yields one `tool-call`.
  - `toolOutputForModel(output: ToolOutput): unknown` sends `{ content, isError }` as-is. Tool text is truncated to 4000 chars with a `…(truncated)` marker.
- **GOTCHA**: diff by part index + `toolCallId`, never by text equality. Streaming can emit the same text twice in a row legitimately.
- **VALIDATE**: `pnpm --filter @web-agents/chat test -- wire`

### 7. CREATE `packages/chat/src/tools.ts`

- **IMPLEMENT**:
  - `listToolDescriptors(): Promise<ToolDescriptor[]>`. Call `getTools()`, parse a string `inputSchema` (Chrome) with `JSON.parse` in try/catch, and default to `{type:"object",properties:{}}`. Description defaults to `title ?? name`. Exclude tools whose window/origin differ from `location.origin` if those fields exist (Chrome returns `origin`, `window`).
  - `callModelContextTool(call, { signal }): Promise<ToolOutput>` wraps core `executeTool`:
    - `null` (navigation) becomes `{content:[{type:"text",text:"The page navigated away while this tool ran; its result is unknown. Check the page before retrying."}]}`.
    - An `AbortError` becomes `{content:[{type:"text",text:"Cancelled by the user."}], isError:true}`.
    - Any other throw becomes `{content:[{type:"text",text:`Error: ${message}`}], isError:true}`.
    - An `Error:` text prefix sets `isError: true`.
- **PATTERN**: `console.ts:171-194`.
- **VALIDATE**: `pnpm --filter @web-agents/chat test -- tools` (browser project, Task 18)

### 8. CREATE `packages/chat/src/adapter/cloud.ts`

- **IMPLEMENT**:
  ```ts
  export interface CloudAdapterOptions {
    api?: string;                    // default "/api/chat"
    maxSteps?: number;               // client-side loop cap, default 8
    headers?: Record<string, string> | (() => Record<string, string>);
    fetch?: typeof fetch;            // injectable for tests
    label?: string;                  // default "Claude (cloud)"
  }
  export function createCloudAdapter(opts?: CloudAdapterOptions): AgentAdapter
  ```
  - `status()` returns the cached result of a one-time `GET api`:
    - `ready` when `enabled`.
    - `unavailable("Chat isn't configured on this site")` when `!enabled` or on a 503.
    - `loading` while the check is pending.
  - `run(req)` is an async generator:
    1. `history = structuredClone(req.messages)`.
    2. `for step = 1..maxSteps`:
       - POST `{ messages: history, tools: req.tools, page: { title: document.title, url: location.href } }` with `signal`.
       - A non-OK status yields an `error` with `code` mapped from 503/429/400 (or `network`), then returns.
       - Yield `message-start` with a fresh assistant id and stream `readParts`. Accumulate the assistant message into `history` while yielding parts.
       - Collect the `tool-call`s. If there are none, yield `{type:"finish", reason:"stop"}` and return.
       - Execute the calls **sequentially**: one page, one cursor, ordered effects. For each, `output = await req.callTool(call)` and yield `tool-result` (or `tool-error` if `output.isError`). Write the output into the history tool part.
       - Yield `step-finish`. If `signal.aborted`, yield `finish("aborted")` and return.
    3. After the loop, yield `finish("max-steps")`.
- **GOTCHA**:
  - Tools change between steps (a tool can hide its own form). The session (Task 9) builds `req` with `tools` as a **getter** that returns the latest list. The adapter must read `req.tools` fresh for each POST and never cache it. Document this in the TSDoc of `AgentRunRequest.tools`.
  - Abort must cancel both the fetch and the in-flight tool. `callTool` receives the signal through the closure.
- **VALIDATE**: `pnpm --filter @web-agents/chat test -- cloud-adapter`

### 9. CREATE `packages/chat/src/session/reducer.ts` + `use-agent-session.ts`

- **IMPLEMENT**:
  - Pure reducer `sessionReducer(state, action)`:
    - State: `{ messages: AgentMessage[]; status: "idle" | "streaming" | "error"; error?: {message, code?} }`.
    - Actions: `send(text)`, `part(AgentStreamPart)`, `toolPhase({id, state, prompt?})`, `stop`, `reset`.
  - Hook `useAgentSession(adapter)`:
    - `send(text)` appends the user message and creates an `AbortController`. It calls `adapter.run({ messages, get tools(){ return latestTools }, signal, callTool })` and `for await`s the parts.
    - `latestTools` refreshes from `listToolDescriptors()` on mount, on `document.modelContext` `toolchange`, and before each `send`.
    - `callTool` delegates to `callModelContextTool`.
    - Subscribe to `onAgentEvent`: when `{type:"park", tool}` matches the running tool card by name, dispatch `toolPhase awaiting-confirmation` with the `prompt`. On `start`/`result`/`error` for that name, return it to `running`.
    - `stop()` aborts.
    - Messages persist in `sessionStorage` (`web-agents:chat:<pathname-agnostic key>`) so a route change or reload keeps the conversation. Cap at 60 messages.
- **GOTCHA**:
  - Tool-name matching between core events and cards is by name. Only one call per name runs at a time, because the loop is sequential.
  - React 19 StrictMode double-invokes effects, so the `toolchange` listener must be removed on cleanup.
- **VALIDATE**: `pnpm --filter @web-agents/chat test -- reducer`

### 10. CREATE components: `AgentChat.tsx`, `MessageList.tsx`, `ToolCallCard.tsx`, `Composer.tsx`, `Suggestions.tsx`

- **IMPLEMENT**:
  - **Load the `components`, `a11y`, `states`, `motion`, `ux-copy` skills first.**
  - `AgentChat` props:
    ```ts
    export interface AgentChatProps {
      adapter?: AgentAdapter; adapters?: AgentAdapter[];   // one of; `adapters` shows a switcher (Phase 6 fills it)
      title?: string;                                        // default "Assistant"
      defaultOpen?: boolean; position?: "bottom-right" | "bottom-left";
      suggestions?: string[] | false;                        // default: derived from tools
      className?: string;
    }
    ```
  - Root:
    - Render via `createPortal` into a `div[data-web-agents-ui][class="wa-chat"]` appended to `document.body`, so the core yield-ignore selector matches and app CSS doesn't cascade in.
    - The launcher button has `aria-expanded` + `aria-controls`.
    - The panel is `role="dialog" aria-modal="false" aria-labelledby`.
    - Escape closes the panel and returns focus to the launcher. Opening focuses the composer.
  - `MessageList`:
    - `role="log" aria-live="polite" aria-relevant="additions"`.
    - Auto-scroll only if the user is at the bottom; otherwise show a "Jump to latest" pill.
    - Assistant text renders as plain text with paragraph breaks. **No markdown/HTML injection in v1.** If markdown is wanted later, use a sanitizing renderer.
  - `ToolCallCard`:
    - Shows the tool name, a compact args summary (`k: v` pairs, truncated), and a status chip by `data-status`.
    - `running` shows an indeterminate shimmer.
    - `awaiting-confirmation` shows the prompt ("Click 'Place order · $71.10' on the page to confirm") plus a "Show me" button that scrolls the target `[toolname=…]` into view.
    - `done` shows result text, collapsible after 2 lines.
    - `error` shows the message.
    - `cancelled` is muted.
  - `Composer`:
    - A textarea that auto-grows up to 6 lines. Enter sends; Shift+Enter inserts a newline.
    - While streaming, the send button becomes **Stop** (same position, `aria-label="Stop"`).
    - Disabled with an explanation when `status().state !== "ready"`.
  - `Suggestions`:
    - Shown when the conversation is empty: up to 3 chips built from the live tools (`"Add Logo tee to the cart"` derived from `tool.description`, first sentence, ≤ 48 chars), plus "What can you do on this page?".
    - Re-computed on `toolchange`.
  - States to cover:
    - empty
    - streaming, with a typing indicator before the first delta
    - error: "Something went wrong. Try again." with a Retry button that resends the last user message
    - `chat_disabled` (offline card)
    - `rate_limited`: "You're sending messages too fast. Try again in a minute."
    - navigated-mid-call
- **GOTCHA**:
  - z-index: panel at `calc(var(--agent-z) - 2)` and the spotlight below it. Verify the actual value in `cursor.css` and adjust. The spotlight must not blur the chat, and the ghost cursor must render above it.
  - On narrow viewports (< 640 px) the panel becomes a bottom sheet using `100dvh` and `env(safe-area-inset-bottom)`. Load the `mobile-feel` skill.
  - The composer `font-size` is ≥ 16px to avoid iOS zoom.
- **VALIDATE**: `pnpm --filter @web-agents/chat typecheck && pnpm --filter @web-agents/chat test -- agent-chat`

### 11. CREATE `packages/chat/src/chat.css`

- **IMPLEMENT**:
  - Everything inside `@layer web-agents { .wa-chat … }`.
  - Custom properties at `.wa-chat` (`--wa-chat-bg`, `--wa-chat-fg`, `--wa-chat-accent: var(--agent, #111)`, `--wa-chat-radius: 14px`, `--wa-chat-shadow`), with light/dark via `@media (prefers-color-scheme: dark)` and `[data-theme=dark]` on an ancestor.
  - Panel enter: opacity + `translateY(8px) scale(.98)` → none, 180 ms, `var(--agent-ease-out)`.
  - Under `prefers-reduced-motion`: opacity only.
  - Animate transforms and opacity only.
- **DECISION (scoped CSS, not Shadow DOM)**:
  - Shadow DOM would isolate styles, but it breaks three things we rely on:
    - core's yield-ignore `closest()` check and focus-return across the boundary, which needs `composedPath` everywhere;
    - the "Show me" scroll into light-DOM targets;
    - app theming via CSS variables. Those pierce the boundary, but app font/size tokens would need re-declaring.
  - A unique prefix + `@layer` gives low-specificity styles apps can override, and app styles can't accidentally win, because we never style bare elements outside `.wa-chat`.
- **VALIDATE**: `pnpm biome check packages/chat`

### 12. CREATE `packages/chat/src/index.ts`

- **IMPLEMENT**:
  - Export `AgentChat`, `createCloudAdapter`, `useAgentSession`, `listToolDescriptors`, `callModelContextTool`, and all types from `types.ts`.
  - Do NOT import the CSS from JS. Consumers `import "@web-agents/chat/chat.css"`, matching core's `cursor.css` convention.
- **VALIDATE**: `pnpm --filter @web-agents/chat build && test -f packages/chat/dist/chat.css && ! grep -q "@ai-sdk/anthropic" packages/chat/dist/index.mjs`

### 13. CREATE `packages/chat/src/vite/node-bridge.ts` + `index.ts`

- **IMPLEMENT**:
  - `toWebRequest(req: IncomingMessage, origin: string): Request`. The URL is `new URL(req.url!, origin)`; headers copy from `req.headers` (join arrays). For non-GET/HEAD, `body: Readable.toWeb(req)` with `duplex: "half"`. An `AbortController` aborts on `req.on("close")` when `!res.writableEnded`.
  - `sendWebResponse(res: ServerResponse, response: Response)` sets status and headers. If there is a body, `Readable.fromWeb(response.body).pipe(res)`; otherwise `res.end()`.
  - `webAgentsChatDev({ path = "/api/chat", handler, envPrefix = "" } = {}): Plugin`:
    - `name: "web-agents-chat-dev"`, `apply: "serve"`.
    - `configResolved(c)` runs `loadEnv(c.mode, c.envDir ?? c.root, envPrefix)` and copies `ANTHROPIC_API_KEY` / `WEB_AGENTS_MODEL` into a private env object passed to `createChatHandler({ env })`. Do **not** mutate `process.env`.
    - `configureServer(server)` calls `server.middlewares.use(path, …)`.
    - The handler defaults to `createChatHandler({ env })`.
- **GOTCHA**:
  - Connect's `use(path)` strips the prefix from `req.url`. Rebuild the URL from `req.originalUrl`.
  - Never read the key from `import.meta.env`. Never suggest a `VITE_ANTHROPIC_API_KEY`, because anything `VITE_`-prefixed is shipped to the browser.
- **VALIDATE**: `pnpm --filter @web-agents/chat test -- vite-plugin`

### 14. CREATE `apps/playground/.env.example` and UPDATE `.gitignore`

- **IMPLEMENT**:
  - `.env.example`:
    ```
    # server-side only, read by @web-agents/chat/vite in dev and by api/chat.ts on Vercel
    ANTHROPIC_API_KEY=
    WEB_AGENTS_MODEL=claude-opus-5-5
    ```
  - Ensure the root `.gitignore` has `.env*.local` and `.env`, but not `.env.example`.
- **VALIDATE**: `git check-ignore apps/playground/.env.local && ! git check-ignore apps/playground/.env.example`

### 15. UPDATE `apps/playground/vite.config.ts`

- **IMPLEMENT**: add `webAgentsChatDev()` to `plugins`. Keep the existing `resolve.conditions` for `@web-agents/source`.
- **VALIDATE**: `pnpm --filter playground dev & sleep 4; curl -s localhost:5173/api/chat; kill %1`. Expect `{"enabled":false,…}` without a key and `true` with one.

### 16. UPDATE `apps/playground/src/main.tsx` (and ecommerce/flights `main.tsx` if Phase 4 is done)

- **IMPLEMENT**:
  - `import "@web-agents/chat/chat.css"`.
  - Render `<AgentChat adapter={cloud} />`, where `const cloud = createCloudAdapter()`, inside `<WebAgentsProvider>` (Phase 2), so route-scoped tools are what the model sees.
  - The dev devtools panel stays. Set `defaultOpen={false}`.
  - Make the launcher sit opposite the devtools panel: `position="bottom-left"` when devtools are on the right.
- **GOTCHA**: the adapter must be created once (module scope or `useMemo`). Recreating it per render re-fires the GET status check.
- **VALIDATE**: `pnpm --filter playground typecheck && pnpm --filter playground build`

### 17. UPDATE `.agents/plans/00-web-agents-roadmap.md` (contract additions, same commit)

- **IMPLEMENT**:
  - In the `@web-agents/chat` contract:
    - add `prepare?()` to `AgentAdapter`;
    - add `<AgentChat adapter | adapters>`;
    - add `ChatHandlerOptions.guard` and the `GET` capability response.
  - In core:
    - add `YieldOptions.ignore`;
    - add `executeTool` / `normalizeToolResult` exports.
- **VALIDATE**: `grep -n "prepare?()" .agents/plans/00-web-agents-roadmap.md`

### 18. CREATE tests (see TESTING STRATEGY), then `packages/chat/README.md`

- **IMPLEMENT**:
  - Write all the test files listed under "New Files to Create".
  - README sections:
    - install
    - client snippet
    - `api/chat.ts` snippet (Vercel)
    - Vite dev plugin
    - security notes: key server-side, the `guard` hook, payload caps
    - adapter interface for custom agents
- **VALIDATE**: `pnpm --filter @web-agents/chat test`

---

## TESTING STRATEGY

`packages/chat/vitest.config.ts` defines two projects:
- `node`: `test/{reducer,wire,handler,cloud-adapter,vite-plugin}.test.ts`, `environment: "node"`.
- `browser`: `test/*.browser.test.tsx` and `test/tools.test.ts`, `browser: { enabled: true, provider: playwright(), instances: [{ browser: "chromium" }] }`.

The root `vitest.config.ts` `projects` already globs `packages/*`.

### Unit Tests

- `reducer.test.ts`:
  - `send` appends a user message.
  - `text-delta` grows the right assistant message.
  - `tool-call` adds a running card.
  - `toolPhase awaiting-confirmation` sets the prompt.
  - `tool-result` sets done/error by `isError`.
  - `stop` marks running cards `cancelled`.
  - `error` with `code` is preserved.
- `wire.test.ts`:
  - `toUIMessages` round-trips: text → UI text; done tool → `output-available`; error/cancelled → `output-error`.
  - `readParts` diffing: feed a hand-built UI-message SSE stream (`data: {...}\n\n` lines; take real chunk shapes from a handler run and snapshot them) and assert the exact `AgentStreamPart` sequence.
- `handler.test.ts` (mock model from `ai/test`; verify the class name):
  - GET returns `{enabled:false}` with no key and `{enabled:true}` with `env.ANTHROPIC_API_KEY` or a model instance.
  - POST 405/400 cases: 49 tools; a bad tool name; a schema > 8 KB; a body > 256 KB; duplicate names.
  - POST with no key returns 503 `chat_disabled`.
  - `guard` returning `new Response(null,{status:429})` short-circuits.
  - The mock model receives: the system prompt; tools whose `inputSchema` has no `$schema`; `maxOutputTokens` 1024.
  - After `maxSteps` trailing tool steps, the model receives `tools: {}`.
- `cloud-adapter.test.ts` (integration in Node):
  - Setup: `fetch = (url, init) => handler(new Request(new URL(url, "http://x"), init))`. The mock model streams a tool call on the first request and text on the second.
  - Assert:
    - the parts order `message-start, tool-call, tool-result, step-finish, message-start, text-delta…, finish(stop)`;
    - `callTool` is called with the parsed input;
    - the second request body contains the tool output.
  - Separate cases:
    - abort mid-stream yields `finish("aborted")`, and no further fetch happens;
    - 429 yields `error{code:"rate_limited"}`;
    - `maxSteps: 2` with a model that always calls tools yields `finish("max-steps")`.
- `vite-plugin.test.ts`:
  - Start `createServer({ configFile:false, root: tmp, plugins:[webAgentsChatDev({ handler: async r => new Response(JSON.stringify({ m: r.method, body: await r.text() })) })], server:{ port:0 } })`, `listen()`, then fetch POST `/api/chat`. Assert the echo, streaming passthrough, and a 404 for `/api/other` (falls through to Vite).

### Integration Tests

- `tools.test.ts` (browser):
  - Setup: install `@web-agents/polyfill`, append a fixture `<form toolname="echo" toolautosubmit>` whose submit handler `respondWith`s `"ok: "+value`, plus an imperative tool via `registerTool`.
  - Assert:
    - `listToolDescriptors()` returns both with object schemas;
    - `callModelContextTool` returns normalized output;
    - a tool that throws returns `isError`;
    - aborting calls `cancelTool`;
    - a tool resolving `null` maps to the navigation message (stub `executeTool`).
- `agent-chat.browser.test.tsx`:
  - Render `<AgentChat adapter={fake} />`, where `fake.run` yields scripted parts with `await` gaps.
  - Assert:
    - the launcher opens the panel and the composer has focus;
    - typing + Enter shows the user bubble, a typing indicator, then streamed text;
    - a tool card goes running → awaiting-confirmation (dispatch the core event `{type:"park"}` via the core test emitter) → done;
    - Stop aborts the fake's signal;
    - Escape closes and focus returns to the launcher;
    - the `role="log"` region exists;
    - the panel root carries `data-web-agents-ui`.

### Edge Cases

- A tool list that changes between steps: after `apply_promo` hides the promo form, the next POST must not include `apply_promo`.
- `place_order` without autosubmit: the card shows awaiting-confirmation until the user clicks. If the user cancels (polyfill ✕ / `toolcancel`), the card becomes cancelled and the model is told "Cancelled by the user."
- Navigation mid-tool (`executeTool → null`) in a multi-page example (Phase 4 router).
- The model requests a tool that no longer exists: return `isError` "Tool X is not available on this page right now", never throw out of the loop.
- Concurrent sends are blocked while streaming (the composer is disabled; Stop is offered).
- A huge tool result is truncated before it is sent back.
- No `document.modelContext` (SSR / unsupported browser): the widget renders the offline state with the polyfill hint and does not crash at import time. Access the DOM only in effects.
- User typing in the composer must not trigger cursor yield, verified by the `data-web-agents-ui` test plus a manual check.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm biome ci .
pnpm turbo run typecheck --filter=@web-agents/chat... --filter=@web-agents/core --filter=playground
```

### Level 2: Unit Tests

```bash
pnpm --filter @web-agents/chat test -- --project node
pnpm --filter @web-agents/core test
```

### Level 3: Integration Tests

```bash
pnpm exec playwright install chromium
pnpm --filter @web-agents/chat test -- --project browser
pnpm turbo run build --filter=@web-agents/chat...
test -f packages/chat/dist/index.mjs && test -f packages/chat/dist/server/index.mjs && test -f packages/chat/dist/vite/index.mjs
! grep -rq "ANTHROPIC_API_KEY\|@ai-sdk/anthropic" packages/chat/dist/index.mjs
pnpm --filter playground build && ! grep -rq "sk-ant-" apps/playground/dist
```

### Level 4: Manual Validation

Requires a real `ANTHROPIC_API_KEY` in `apps/playground/.env.local`.

1. `pnpm --filter playground dev`. `curl -s localhost:5173/api/chat` returns `{"enabled":true,"model":"claude-opus-5-5"}`.
2. `curl -s -XPOST localhost:5173/api/chat -H 'content-type: application/json' -d '{"messages":[],"tools":[{"name":"bad name","description":"x","inputSchema":{}}]}'` returns 400.
3. Use the `agent-browser` skill:
   - open `http://localhost:5173` and open the Assistant;
   - send "Add 2 logo tees to my cart and apply promo 123";
   - expect the ghost cursor to type qty, click, type the code, and click Apply; tool cards go running → done; the final reply mentions the new total.
   - Screenshot each step to `/tmp/phase5/`.
4. Send "Place the order". Expect the card to show "Waiting for you: click 'Place order · $…'", with the cursor parked. Click the button: the card goes done, and the reply confirms the order id.
5. Send a message, then press Stop mid-stream. The stream halts, and any running card shows cancelled.
6. Unset the key and restart. The launcher shows the offline state; no request is sent on Enter.
7. Keyboard only: Tab to the launcher, Enter, type, Enter, Escape. Focus returns to the launcher. Check VoiceOver announces new assistant text (the `a11y` skill's five-minute screen-reader test).
8. With macOS reduced motion on: the panel fades without sliding.

### Level 5: Additional Validation (Optional)

- Run the `e2e-test` skill against `apps/playground` (and ecommerce/flights if wired).
- Run the `security-review` skill on the branch, focusing on `packages/chat/src/server/**` and `vite/**`.
- Run `react-doctor` on `packages/chat`.

---

## ACCEPTANCE CRITERIA

- [ ] `AgentAdapter`, `AgentRunRequest` and the stream part types match the roadmap; the roadmap is updated for `prepare?()`, `adapters`, `guard`, `YieldOptions.ignore`, and `executeTool`
- [ ] `createCloudAdapter` runs a multi-step tool loop against `/api/chat`, executing tools **in the browser** via `document.modelContext`, with visuals playing
- [ ] Confirmation-gated tools surface as "awaiting confirmation" cards, driven by core `park` events
- [ ] `createChatHandler` validates the payload, enforces caps, defaults to `claude-opus-5-5` (overridable via `WEB_AGENTS_MODEL`), returns 503 when unconfigured, and supports `guard`
- [ ] `webAgentsChatDev()` serves `/api/chat` in `vite dev`, with the key read server-side only
- [ ] The client bundle contains no provider SDK and no key
- [ ] The widget passes keyboard/screen-reader checks, honours reduced motion, works as a bottom sheet on mobile, and covers empty/streaming/error/offline/rate-limited states
- [ ] Typing in the chat does not trigger the cursor's yield-to-user
- [ ] All Level 1–3 commands pass; manual Level 4 is completed with screenshots
- [ ] Code follows Phase 1 conventions (named exports, TSDoc, Biome clean)

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms the feature works
- [ ] Acceptance criteria all met
- [ ] `/code-review`, `/simplify`, `security-review` run and findings addressed
- [ ] `/commit` in coherent commits: (core helpers) → (chat server) → (chat client) → (widget) → (vite plugin + playground)

---

## NOTES

- **Why not `useChat`.** It would tie the session to AI SDK's React state and make the local adapter (Phase 6) a second code path. The loop behind `AgentAdapter.run` is small and fully testable in Node against the real handler, and the wire format is still AI SDK's UI message stream, so a team that prefers `useChat` can point it at the same `/api/chat`.
- **Sequential tool execution is deliberate.** One ghost cursor, one page. Parallel calls would fight over the cursor and over form state.
- **Abuse protection is Phase 7.** Production rate limits and origin checks plug into `guard`. This phase only adds structural caps.
- **Model choice.** `claude-opus-5-5` by default per the roadmap. Public demos should set `WEB_AGENTS_MODEL=claude-sonnet-5-5` (Phase 7).
- **Risks:**
  - AI SDK v7 export names (`readUIMessageStream`, the mock model class, the tool UI part type for request-time tools) must be verified against installed types. Tasks 5-6 call this out, and the round-trip test will catch any mismatch.
  - Chrome's `getTools()` / `executeTool` shapes keep moving; they are isolated in core `executeTool`.

**Confidence: 7/10** for one-pass success. The main uncertainty is exact AI SDK v7 symbol names and UIMessage tool-part shapes; tests are designed to surface those immediately.
