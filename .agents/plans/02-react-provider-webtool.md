# Feature: `@web-agents/react` provider + `WebTool` API (Phase 2)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> Read first: `.agents/plans/00-web-agents-roadmap.md`. It is the source of truth for package names, contracts and versions.
> This plan assumes Phase 1 (`01-monorepo-core-extraction.md`) is merged. File references give the **current path:line**
> and the **post-Phase-1 path** (`→`). After Phase 1, line numbers shift slightly, so locate code by the quoted snippet.

## Feature Description

Two pieces that together make WebMCP tools a first-class, React-friendly, server-aligned API:

1. **`WebTool` (in `@web-agents/core`)**: `defineWebTool({ id, description, inputSchema, outputSchema?, annotations?, requireConfirmation?, target?, execute })`.
   It has the same shape as Mastra's `createTool` config and the Vercel AI SDK `tool()` input. The same object can therefore be registered with
   the browser (`document.modelContext.registerTool`), shown in devtools (Phase 3), and sent to a server agent as a
   client-side tool (Phase 5). Schemas are **Standard Schema** (zod 4 / valibot / arktype), converted to JSON Schema
   through **Standard JSON Schema**, or plain JSON Schema objects.
2. **Tool registry + React layer**:
   - **`createToolRegistry(catalog)` (core, framework-agnostic):** ref-counted enable/disable of catalog tools, registering and unregistering them with WebMCP.
   - **`@web-agents/react`:**
     - `<WebAgentsProvider>` takes global tools, route-scoped tools and the visuals install.
     - `useEnableTools([...])` / `<EnableTools>` enable tools from a component: register on mount, unregister on unmount.
     - `useWebTool(tool)` registers an inline tool bound to component state.
     - `useToolAnswer()`, the former `useAnswerGrace`, serves declarative forms.
     - `useAgentEvents()` subscribes to agent events.
     - The package also ships the JSX attribute types (`toolname`, …).

## User Story

As a React developer adding agent capabilities to my web app
I want to declare tools once (typed with zod), turn them on globally, per route, or per mounted component, and have them animate with the agent cursor automatically
So that agents only see the tools that make sense on the current screen, and the same tool definitions can be reused by a server-side agent

## Problem Statement

- Tools are registered ad hoc today: declarative `<form toolname>` elements, or `useWebMCP` from `use-webmcp-tool` (`src/tools/ClearCartButton.tsx:14-21`). There is no typed schema, no validation, no shared shape with server tool frameworks, and no notion of "which tools are on for this page".
- `installAgentVisuals` must run **before** any imperative tool registers, or the tool can't be synchronised with the cursor (`src/agent-visuals/index.ts:418-430` wraps `registerTool` once). Today that ordering is a manual rule in `src/main.tsx:13-18`.
- Chrome cancels a running call when its tool definition changes ("Tool execution cancelled, since tool definition was updated", see `src/tools/useAnswerGrace.ts:6-12`). Naive mount/unmount registration in React, made worse by StrictMode's double mount and route transitions, churns definitions and cancels in-flight calls.
- The JSX attribute augmentation lives in app code (`src/types/webmcp.d.ts:106-115` → `apps/playground/src/jsx-webmcp.d.ts`), so every app has to copy it.

## Solution Statement

- **`defineWebTool`** normalises any schema into `jsonSchema` (draft-07, `$schema` stripped). `run()` validates input via `~standard.validate` and turns validation and execution errors into MCP `isError` results the agent can recover from. `toModelContextTool()` adapts a WebTool to the WebMCP `ModelContextTool` shape.
- **`requireConfirmation`** waits for a *trusted* user click on the tool's target before executing. The visuals layer parks the cursor on the target instead of clicking it. This mirrors the declarative "no `toolautosubmit`" confirm gate for imperative tools.
- **Registry**: ref-counted, with **deferred unregistration**: a 0-count tool is unregistered after a macrotask, and only once no call is in flight plus a 500 ms answer grace. StrictMode remounts and route swaps therefore never churn definitions or cancel a pending call. Duplicate IDs throw. Unknown names warn with the list of valid names.
- **Provider**:
  - installs visuals itself (ref-counted, before the first registration), owns one registry, and computes the enabled set as `global ∪ routes[match(pathname)] ∪ component enables`;
  - passes `context` (app state) to tool `execute` as `ctx.context`, with type-safe access through a `Register` interface augmentation.
- **`useWebTool`** registers a stable proxy whose `execute` always calls the **latest** render's `execute` (fresh closures). It re-registers only when the definition signature changes: id, description, JSON schema, annotations or `requireConfirmation`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**:
- `packages/core`: new `web-tool.ts`, `registry.ts`, `confirm.ts`, `deferred.ts`, `result.ts`; small change in `visuals.ts`
- `packages/react`: new package
- `apps/playground`: migration proof

**Dependencies**: `@standard-schema/spec@^1.1.0` (types only, core), `zod@^4.6.7` (playground + tests only), `react@>=18` (peer of `@web-agents/react`), `vitest-browser-react` (dev, confirm the current version with `npm view vitest-browser-react version`)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/agent-visuals/index.ts` → `packages/core/src/visuals.ts`
  - (lines 108, 158-166): `installed` flag and the early return. Phase 1 replaces it with ref-counting and `destroy()`. The provider relies on that.
  - (line 110): `byTool(name)` looks elements up by `[toolname="…"]`. WebTool `target` must feed into the same lookup. **Change here:** `byTool` must check a registered `target` selector first (see Task 7).
  - (lines 263-319): the `toolactivated` handler. It skips gated imperative tools (`gated.has(toolName)`, line 266).
  - (lines 418-430): `registerTool` wrapping; the `gated` set; execution goes through `runGated`. **WebTools registered through `registerWebTool` pass through here.** That is how they get cursor sync for free. Keep the `options` passthrough (`{ signal }`).
  - (lines 435-487): `runGated`, including `GATE_TIMEOUT_MS = 2500`, the abort handling and the `click(release)` choreography. Task 7 adds a `requireConfirmation` branch: park instead of click, and do not apply the 2.5 s timeout.
  - (lines 301-307 in `cursor.ts`): `park(prompt)` / `unpark()`.
- `src/tools/useAnswerGrace.ts` (whole file, 27 lines) → `apps/playground/src/tools/useAnswerGrace.ts`. It holds the rationale and the `RESPONSE_GRACE_MS = 500` constant. It moves to `@web-agents/react` as `useToolAnswer` (same behaviour), and the registry reuses the same grace constant.
- `src/tools/ClearCartButton.tsx` (lines 8-33) → `apps/playground/src/tools/ClearCartButton.tsx`. This is the migration target: `useWebMCP` + `toolname` button.
- `src/store.tsx` (lines 26-38 `CartApi`, 126-131 `useCart`, 133-141 `settle`/`errorMessage`) → `apps/playground/src/store.tsx`. It shows the result-string + throw-on-bad-input convention that tools follow: errors become `"Error: …"` text for the agent.
- `src/App.tsx` (lines 9-36 `Totals` with the Remove promo button; 38-69 `Cart`; 71-89 `App` wraps in `CartProvider`) → `apps/playground/src/App.tsx`.
- `src/main.tsx` (lines 7-34) → `apps/playground/src/main.tsx`. It covers polyfill → visuals → render → console ordering. The provider takes over visuals install.
- `src/types/webmcp.d.ts`:
  - (lines 25-31) `ModelContextTool` and (lines 49-80) `ModelContext` → `packages/core/src/webmcp.ts` (global).
  - (lines 106-115) the `declare module "react"` JSX augmentation → `apps/playground/src/jsx-webmcp.d.ts` after Phase 1. **This phase moves it into `packages/react/src/jsx.ts`.**
- `dev/webmcp-polyfill.ts` (lines 34-38 `normalize`, 52-56 `registerTool` with `signal`, 62-82 `executeTool`) → `packages/polyfill/src/index.ts`. Tests use the polyfill. Note that it converts thrown errors into `isError` results (line 77).
- `node_modules/use-webmcp-tool/useWebMCP.d.ts`: the reference shape for `enabled`, `formatOutput`, `onError` and the MCP result normalisation. We replace it in the playground but keep naming parity (`enabled`).

### New Files to Create

- `packages/core/src/web-tool.ts`: `defineWebTool`, `toModelContextTool`, `registerWebTool`, `WebToolInputError`, JSON-schema normalisation
- `packages/core/src/result.ts`: `toToolResult(value)` / `errorResult(err)` (MCP content normalisation shared with the polyfill semantics)
- `packages/core/src/confirm.ts`: `waitForConfirmation(selector, signal)` (trusted click / Enter on the target) + `CONFIRM` symbol
- `packages/core/src/deferred.ts`: `deferRelease(fn, { isBusy, graceMs })`, used by the registry and by visuals ref-counting
- `packages/core/src/registry.ts`: `createToolRegistry(catalog, options?)`
- `packages/core/src/path-match.ts`: `matchPath(pattern, pathname)` (`:param`, `*`, trailing slash tolerant)
- `packages/core/src/web-tool.test.ts` (node), `packages/core/src/web-tool.types.test.ts` (node, `expectTypeOf`), `packages/core/src/path-match.test.ts` (node), `packages/core/src/registry.browser.test.ts` (browser), `packages/core/src/confirm.browser.test.ts` (browser)
- `packages/react/package.json`, `packages/react/tsconfig.json`, `packages/react/tsdown.config.ts`, `packages/react/vitest.config.ts`
- `packages/react/src/index.ts`: public exports
- `packages/react/src/jsx.ts`: JSX attribute augmentation (moved from the app)
- `packages/react/src/context.ts`: `WebAgentsContext`, `useWebAgents()`
- `packages/react/src/provider.tsx`: `<WebAgentsProvider>`
- `packages/react/src/use-pathname.ts`: Navigation API / popstate pathname store (`useSyncExternalStore`)
- `packages/react/src/use-enable-tools.ts`: `useEnableTools`, `<EnableTools>`
- `packages/react/src/use-web-tool.ts`: `useWebTool`
- `packages/react/src/use-tool-answer.ts`: `useToolAnswer` (moved `useAnswerGrace`)
- `packages/react/src/use-agent-events.ts`: `useAgentEvents`
- `packages/react/src/provider.browser.test.tsx`, `packages/react/src/use-web-tool.browser.test.tsx`
- `apps/playground/src/tools/catalog.ts`: module-level catalog (`get_cart`, `remove_promo`, `list_orders`)
- `apps/playground/src/Orders.tsx`: `/orders` view for the route-scoped example

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Standard Schema spec](https://github.com/standard-schema/standard-schema#the-interface)
  - `StandardSchemaV1['~standard'].validate` returns `{ value } | { issues }`, sync or async.
  - Why: input validation in `WebTool.run`.
- [Standard JSON Schema (same repo, v1.1)](https://github.com/standard-schema/standard-schema#standard-json-schema)
  - `~standard.jsonSchema.input({ target: "draft-07" })`.
  - Why: library-agnostic JSON Schema export (verified against zod 4.6.7 during research).
- [Zod JSON Schema](https://zod.dev/json-schema#ztojsonschema)
  - `z.toJSONSchema(schema, { target: "draft-07", io: "input" })`.
  - Why: documented fallback in the error message when a schema lacks `~standard.jsonSchema`.
- [Mastra createTool](https://mastra.ai/reference/tools/create-tool#define-schemas) and [Mastra client tools](https://mastra.ai/reference/client-js/agents#client-tools)
  - `{ id, description, inputSchema, outputSchema?, execute(input, context) }`.
  - Why: the structural alignment target ("WebTool works where a Mastra tool config works").
- [AI SDK tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#dynamic-tools)
  - `inputSchema`, tools without `execute` = client tools.
  - Why: Phase 5 sends `WebTool.jsonSchema` there.
- [Chrome WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api#discover-tools)
  - `registerTool({ name, title, description, inputSchema, annotations, execute }, { signal })`, tool name rules, `getTools()` fields.
- [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore#subscribing-to-a-browser-api)
  - Why: pathname store + registry subscription.
- [Navigation API `currententrychange`](https://developer.mozilla.org/en-US/docs/Web/API/Navigation/currententrychange_event)
  - Why: router-agnostic pathname updates without patching `history`.
- [React StrictMode double effects](https://react.dev/reference/react/StrictMode#fixing-bugs-found-by-re-running-effects-in-development)
  - Why: deferred release design.
- [Vitest expectTypeOf](https://vitest.dev/api/expect-typeof) and [vitest-browser-react](https://github.com/vitest-dev/vitest-browser-react#readme)
  - Why: type-level alignment test and component tests in browser mode.

### Patterns to Follow

**File header doc comments.** Every module opens with a block comment explaining *why*. Mirror `src/tools/useAnswerGrace.ts:6-15`:
```ts
/**
 * Chrome cancels a tool call whose definition changes mid-flight ("Tool
 * execution cancelled, since tool definition was updated"), and unmounting or
 * un-naming a declarative form changes it. When a tool's own action makes it
 * disappear …, keep it in place until the agent has its answer.
 */
```

**Naming.**
- Files are kebab-case in packages (Phase 1 convention: `user-yield.ts`).
- Components are PascalCase; hooks are `useX`.
- Constants are `SCREAMING_SNAKE` with units in the name (`RESPONSE_GRACE_MS`, `GATE_TIMEOUT_MS`).
- Tool ids are snake_case (`clear_cart`, `apply_promo`).

**Errors for the agent are text, not throws.** Follow `src/store.tsx:133-141`:
```ts
export function settle(action: () => string): Promise<string> {
  try { return Promise.resolve(action()); } catch (err) { return Promise.resolve(`Error: ${errorMessage(err)}`); }
}
```
WebTool goes one step further and returns `{ content:[{type:"text",text}], isError:true }` (the polyfill does this at `dev/webmcp-polyfill.ts:77`). An `AbortError` is **re-thrown** so cancellation propagates.

**Result normalisation.** Mirror the polyfill's `normalize` (`dev/webmcp-polyfill.ts:34-38`):
```ts
if (r && typeof r === "object" && Array.isArray(r.content)) return r;
if (r == null) return { content: [] };
return { content: [{ type: "text", text: typeof r === "string" ? r : JSON.stringify(r) }] };
```

**Feature-detect, never assume, `document.modelContext`.** Follow `src/agent-visuals/index.ts:113-119` (`onLifecycle`) and `:423-424` (`if (sync && mc)`).

**Developer-facing errors name the fix.** Follow `src/main.tsx:22` (`"#root is missing from index.html"`), e.g. `useEnableTools must be used inside <WebAgentsProvider>` (mirrors `src/store.tsx:128`).

**Options objects with documented defaults.** Follow `AgentVisualsOptions` (`src/agent-visuals/index.ts:34-56`): every field gets a TSDoc line with its default.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation (core primitives)

- `result.ts` (MCP normalisation), `deferred.ts` (deferred release), `path-match.ts`.
- `web-tool.ts`: `defineWebTool`, JSON schema derivation, validation, `toModelContextTool`, `registerWebTool`.
- `confirm.ts`: trusted-click confirmation gate.

### Phase 2: Core implementation

- `registry.ts`: ref-counted catalog registry with deferred, in-flight-aware unregistration and `subscribe`.
- `visuals.ts`:
  - `target` lookup and the `requireConfirmation` choreography (park instead of click) for gated tools;
  - ref-counted `installAgentVisuals` with **deferred** teardown, so StrictMode doesn't tear down and rebuild the `registerTool` wrapper.

### Phase 3: React package + integration

- Scaffold `@web-agents/react` (package.json exports with the `@web-agents/source` condition, tsdown, vitest browser project).
- Provider, context, hooks, JSX types.
- Migrate `apps/playground`:
  - provider at root;
  - `clear_cart` via `useWebTool` with `requireConfirmation`;
  - `remove_promo` via `<EnableTools>` (component-scoped);
  - `list_orders` via `routes` (route-scoped);
  - `get_cart` global;
  - delete `use-webmcp-tool` and `jsx-webmcp.d.ts` from the app.

### Phase 4: Testing & validation

- Node unit tests: schema conversion, validation errors, path matching, type-level Mastra/AI SDK alignment.
- Browser tests (polyfill installed): registry ref-counting, StrictMode, route switch, in-flight protection, confirmation, provider integration, `useWebTool` fresh closures.
- Manual: agent-browser run of every playground tool.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 1. ADD `@standard-schema/spec` to `packages/core`

- **IMPLEMENT**:
  - `pnpm --filter @web-agents/core add @standard-schema/spec@^1.1.0`.
  - Types only: import with `import type` everywhere, so nothing lands in the bundle.
  - Add `zod@^4.6.7` as a **devDependency** of core (tests only).
- **GOTCHA**: `@standard-schema/spec` 1.1 exports both `StandardSchemaV1` and `StandardJSONSchemaV1`. Confirm the names with `grep -n "export" node_modules/@standard-schema/spec/dist/index.d.ts`.
- **VALIDATE**: `pnpm --filter @web-agents/core exec node -e "import('@standard-schema/spec').then(()=>console.log('ok'))"`

### 2. CREATE `packages/core/src/result.ts`

- **IMPLEMENT**:
  - `export function toToolResult(value: unknown): ModelContextToolResult`, a verbatim port of the polyfill `normalize` (see Patterns).
  - `export function errorResult(err: unknown): ModelContextToolResult` returns `{ content:[{type:"text", text: message}], isError:true }`. `message` uses `err instanceof Error ? err.message : String(err)`.
  - `export const isAbortError = (e: unknown) => e instanceof DOMException && e.name === "AbortError" || (e as {name?:string})?.name === "AbortError"`.
- **PATTERN**: `dev/webmcp-polyfill.ts:34-38` → `packages/polyfill/src/index.ts`
- **GOTCHA**: Do not import from the polyfill package. Core must not depend on it (see the roadmap dependency direction).
- **VALIDATE**: `pnpm --filter @web-agents/core typecheck`

### 3. CREATE `packages/core/src/deferred.ts`

- **IMPLEMENT**:
  ```ts
  /** Run `release` on a later macrotask unless `cancel()` is called first; while `isBusy()` keep polling every `graceMs`. */
  export function deferRelease(release: () => void, { isBusy = () => false, graceMs = 0 }: { isBusy?: () => boolean; graceMs?: number } = {}): { cancel(): void }
  ```
  - Use `setTimeout(…, 0)` for the first check. If `isBusy()`, re-check every `graceMs` (min 50). Call `release` exactly once.
  - Export `RESPONSE_GRACE_MS = 500` here, documented with the Chrome cancellation rationale copied from `useAnswerGrace.ts:6-15`.
- **GOTCHA**: No DOM access; must run in node tests (timers only).
- **VALIDATE**: covered by the Task 8 test; `pnpm --filter @web-agents/core typecheck`

### 4. CREATE `packages/core/src/path-match.ts` + `path-match.test.ts`

- **IMPLEMENT**:
  - `export function matchPath(pattern: string, pathname: string): boolean`.
  - Supports literal segments, `:param` (one segment), and a trailing `*` (rest, including empty). Normalises trailing slashes (`/a/` ≡ `/a`). Case-sensitive. `"*"` matches everything.
  - Compile the patterns to RegExp once, cached in a `Map`.
  - Do NOT use `URLPattern`: it is not available in every browser the polyfill targets, and the semantics we need are tiny.
- **TESTS**:
  - `matchPath("/product/:slug", "/product/mug")` → true
  - `("/product/:slug", "/product/a/b")` → false
  - `("/checkout", "/checkout/")` → true
  - `("/flights/*", "/flights")` → true
  - `("/flights/*", "/flights/x/y")` → true
  - `("/", "/orders")` → false
- **VALIDATE**: `pnpm --filter @web-agents/core test -- path-match`

### 5. CREATE `packages/core/src/web-tool.ts`

- **IMPLEMENT** (types exactly as in the roadmap contract, plus):
  - `export interface Register {}`, an augmentable interface. `type RegisteredContext = Register extends { context: infer C } ? C : unknown`. Add `context?: RegisteredContext` to `WebToolContext`.
    - This is an **addition to the roadmap contract**: update `00-web-agents-roadmap.md` `WebToolContext` in the same commit.
    - Usage: `declare module "@web-agents/core" { interface Register { context: CartApi } }`.
  - `type JSONSchema = { [k: string]: unknown }`. Re-use the global from `webmcp.ts` if Phase 1 kept it global.
  - Schema handling `function deriveJsonSchema(schema): JSONSchema`:
    1. If `schema` is `undefined`, return `{ type: "object", properties: {} }`.
    2. If `"~standard" in schema`:
       - if `schema["~standard"].jsonSchema?.input` exists, call it with `{ target: "draft-07" }`;
       - else throw `TypeError("WebTool \"<id>\": this schema library doesn't implement Standard JSON Schema. Pass a JSON Schema object instead, e.g. z.toJSONSchema(schema, { target: \"draft-07\", io: \"input\" }).")`.
    3. Otherwise treat the value as a JSON Schema object (shallow-clone it).
    4. Strip `$schema`. If there is no `type`, set `type: "object"`. Throw if `type !== "object"`, since WebMCP needs object inputs.
  - `ID_PATTERN = /^[a-zA-Z0-9_.-]{1,128}$/`. Throw `TypeError` naming the bad id and the rule.
  - `defineWebTool(config)` returns a frozen object `{ ...config, kind: "web-tool", jsonSchema, run }`:
    - `jsonSchema` is computed **lazily**, once, via a getter with memo. That keeps import-time cost zero and is SSR-safe.
    - `run(input, ctx)`:
      - If `inputSchema` is Standard Schema, `const r = await s["~standard"].validate(input ?? {})`. If `r.issues`, throw `new WebToolInputError(id, r.issues)`. Its message is `Invalid input for <id>: <path.join(".")>: <message>; …`.
      - Otherwise pass the input through.
      - Then `await execute(value, ctx)`.
      - If `outputSchema` is set **and** `process.env.NODE_ENV !== "production"`, validate the output and `console.warn` on failure (never throw). Use `globalThis.process?.env?.NODE_ENV`.
  - `toModelContextTool(tool)` returns:
    ```ts
    { name: tool.id, title: tool.title, description: tool.description, inputSchema: tool.jsonSchema, annotations: tool.annotations,
      [CONFIRM]: tool.requireConfirmation ? (tool.target ?? `[toolname="${tool.id}"]`) : undefined,
      [TARGET]: tool.target,
      async execute(args, { signal }) {
        try {
          if (tool.requireConfirmation) await waitForConfirmation(selector, signal, tool.id);
          return toToolResult(await tool.run(typeof args === "string" ? JSON.parse(args || "{}") : args, { signal, source: "webmcp" }));
        } catch (err) { if (isAbortError(err)) throw err; return errorResult(err); }
      } }
    ```
    `CONFIRM` and `TARGET` are `Symbol.for("web-agents.confirm")` / `Symbol.for("web-agents.target")`. They survive `{...tool}` spread in `visuals.ts:428` because spread copies own enumerable symbol properties.
  - `registerWebTool(tool, { signal } = {})`:
    - `const mc = typeof document !== "undefined" ? document.modelContext : undefined`.
    - If `!mc`, warn once (`"[web-agents] document.modelContext is unavailable; import \"@web-agents/polyfill/auto\" in dev or use a WebMCP-enabled Chrome."`) and return a noop.
    - Otherwise create an `AbortController`, chain the outer `signal`, call `mc.registerTool(toModelContextTool(tool), { signal: ac.signal })`, and return `() => { ac.abort(); mc.unregisterTool?.(tool.id) }`. Guard the double unregister with a flag.
- **IMPORTS**: `import type { StandardSchemaV1, StandardJSONSchemaV1 } from "@standard-schema/spec"`; `./result`, `./confirm`
- **GOTCHA**:
  - Chrome < 156 accepted the JSON-**string** args shape. Keep the `typeof args === "string"` branch (see `src/types/webmcp.d.ts:52-62`).
  - Don't validate twice: the browser already validates against `inputSchema` natively in Chrome, but the polyfill doesn't. Standard Schema validation is the authoritative layer.
  - Unknown `annotations` keys are fine. `destructiveHint` is not in `use-webmcp-tool`'s type but is in MCP.
- **VALIDATE**: `pnpm --filter @web-agents/core typecheck && pnpm --filter @web-agents/core test -- web-tool`

### 6. CREATE `packages/core/src/confirm.ts`

- **IMPLEMENT**:
  - `export const CONFIRM = Symbol.for("web-agents.confirm")`; `export const TARGET = Symbol.for("web-agents.target")`.
  - `export function waitForConfirmation(selector: string, signal: AbortSignal, toolId: string): Promise<void>`:
    - Add a listener on `window` (**capture**) for `click` and for `keydown` (Enter/Space).
    - Accept only events where `e.isTrusted` and `e.target instanceof Element && e.target.closest(selector)`.
    - On acceptance call `e.preventDefault(); e.stopImmediatePropagation()`, so the element's own app handler does **not** also run the action. The tool's `execute` is the single source of the action.
    - Emit `{ type: "park", tool: toolId, prompt }` through the core event emitter (`events.ts`) when waiting starts.
    - Reject with `DOMException("Tool execution cancelled","AbortError")` on abort. Remove all listeners on settle.
  - If no element matches `selector` at call time, resolve immediately with a `console.warn`. There's nothing to confirm on, and silently hanging the agent is worse.
- **GOTCHA**:
  - Use `window` capture, not an element listener. React's root listeners run in capture order **before** a target-level capture listener. Only a window-level capture listener plus `stopImmediatePropagation` reliably prevents the React `onClick` from also firing.
  - Synthetic `el.click()` is untrusted and is ignored on purpose, so a script can't self-confirm.
- **VALIDATE**: `pnpm --filter @web-agents/core test -- confirm` (browser test, Task 9)

### 7. UPDATE `packages/core/src/visuals.ts` (was `src/agent-visuals/index.ts`)

- **IMPLEMENT**:
  1. **Target lookup.** Keep a `Map<string, string>` `targets` filled in the wrapped `registerTool` from `tool[TARGET]`. Change `byTool(name)` (line 110) to `document.querySelector(targets.get(name) ?? \`[toolname="${CSS.escape(name)}"]\`)`.
  2. **Confirmation choreography** in `runGated` (lines 435-487). If `tool[CONFIRM]`:
     - do **not** arm `GATE_TIMEOUT_MS`;
     - after `moveTo(el)` call `agentCursor.highlight(el); agentCursor.park(\`Click "${labelOf(el, tool.name)}" to confirm\`)`;
     - **then** call `release()` immediately, so the wrapped `execute` runs and its own `waitForConfirmation` holds the result;
     - when that promise settles, call `agentCursor.unpark()`, then `agentCursor.click()` for visual feedback only if the tool was confirmed (not aborted).
  3. **Ref-counted install with deferred teardown.**
     - Phase 1 introduced `destroy()`. Make the last `destroy()` schedule teardown with `deferRelease` (Task 3), and have a subsequent `installAgentVisuals()` within that window `cancel()` it and reuse the live instance.
     - Effect: React StrictMode's mount → unmount → mount never restores and re-wraps `registerTool`. Tools registered in the first mount keep a wrapper whose closure is still alive.
  4. **Retroactive gating.** Not supported; keep the README rule. Instead `console.warn` once in dev if `registerWebTool` runs while visuals are not installed **and** the app asked for visuals. The provider guarantees ordering, so this is a safety net.
- **PATTERN**: existing `runGated` structure; `labelOf` (line 154).
- **GOTCHA**:
  - `{ ...tool, execute }` at line 428 copies symbol keys. Assert this in a test.
  - Do not read `tool[CONFIRM]` for declarative forms. They have their own browser pause (`pausedSubmitOf`).
- **VALIDATE**: `pnpm --filter @web-agents/core test` (existing Phase 1 visuals browser tests must still pass)

### 8. CREATE `packages/core/src/registry.ts`

- **IMPLEMENT** `createToolRegistry(catalog, options?: { beforeRegister?: () => void; context?: () => unknown })`:
  - `byId = new Map(catalog.map(t => [t.id, t]))`. A duplicate id throws `Error("Duplicate WebTool id \"x\" in catalog")`.
  - `counts = new Map<string, number>()`, `live = new Map<string, () => void>()` (unregister fns), `inflight = new Map<string, number>()`, `pending = new Map<string, {cancel():void}>()`.
  - Wrap each catalog tool for registration: a **derived** WebTool whose `execute(input, ctx)` increments `inflight`, calls the original with `{ ...ctx, context: options.context?.() }`, and decrements in `finally`. Build it with `defineWebTool({ ...tool, execute })` once per id, lazily.
  - `enable(names)`:
    - for each name:
      - unknown → dev `console.warn('Unknown tool "x". Catalog: a, b, c')`, skip;
      - `counts++`;
      - if `pending` has the name, `cancel()` it (re-enabled before release);
      - if now 1 and not in `live`, call `options.beforeRegister?.()` then `live.set(name, registerWebTool(derived))`;
    - notify subscribers;
    - return an idempotent disposer that decrements and, at 0, schedules `deferRelease(() => { live.get(n)?.(); live.delete(n); notify() }, { isBusy: () => (inflight.get(n) ?? 0) > 0, graceMs: RESPONSE_GRACE_MS })`.
  - `enabled()` returns the sorted array of `live` keys, memoised per change (stable identity for `useSyncExternalStore`).
  - `update(catalog)`:
    - replace definitions;
    - for live tools whose **signature** changed (`JSON.stringify([description, jsonSchema, annotations, !!requireConfirmation, target])`), re-register;
    - drop live tools no longer in the catalog (deferred).
    - **Add `update` to the roadmap contract.**
  - `destroy()` cancels pending releases, unregisters everything immediately and clears subscribers.
- **GOTCHA**:
  - Never unregister synchronously in a disposer. StrictMode runs effect cleanup + setup back-to-back in the same tick, and the deferral turns that into a no-op.
  - In-flight calls must finish before unregister, otherwise Chrome cancels them (`useAnswerGrace.ts` rationale).
- **VALIDATE**: `pnpm --filter @web-agents/core test -- registry`

### 9. CREATE core tests

- `web-tool.test.ts` (node):
  - zod schema → `jsonSchema` has `type:"object"`, `properties.qty.type === "integer"` for `z.number().int()`, and no `$schema`;
  - plain JSON schema passes through;
  - a non-object schema throws;
  - a bad id throws;
  - `run` with invalid input rejects with `WebToolInputError` whose message contains the path;
  - `toModelContextTool(t).execute({qty:"x"}, {signal})` **resolves** to `isError: true` (does not throw);
  - an aborted signal → rejects `AbortError`;
  - string args are parsed;
  - `jsonSchema` is computed once (spy).
- `web-tool.types.test.ts` (node, `expectTypeOf`):
  - Local mirror:
    ```ts
    type MastraLikeToolConfig<I, O> = { id: string; description: string; inputSchema?: StandardSchemaV1<unknown, I>; outputSchema?: StandardSchemaV1<unknown, O>; execute?: (input: I, context: any) => Promise<O> };
    ```
  - Assert `expectTypeOf(defineWebTool({ id:"x", description:"d", inputSchema: z.object({a:z.string()}), execute: async ({a}) => a.length })).toExtend<MastraLikeToolConfig<{a:string}, number>>()`.
  - Assert `execute`'s `input` is inferred as `{ a: string }`.
  - Note in a comment: "Mastra's real type is checked in Phase 5 when `@mastra/client-js` is optionally tried; this mirror documents the contract."
- `registry.browser.test.ts` (browser; `beforeAll(() => installWebMCPPolyfill())`):
  1. enabling twice + disposing once keeps the tool registered (`getTools()` includes it);
  2. disposing to 0 removes it after `await new Promise(r => setTimeout(r, 20))`;
  3. dispose + re-enable in the same tick never fires `toolchange` (count events);
  4. a tool with a pending `executeTool` (execute awaits a deferred) stays registered after dispose until the call settles + 500 ms;
  5. `update` with a changed description re-registers, and the same signature doesn't;
  6. `ctx.context` receives `options.context()`.
- `confirm.browser.test.ts`:
  - use `userEvent.click` from `vitest/browser` (trusted) on the target → resolves, and the button's own `onclick` spy is **not** called;
  - `button.click()` (untrusted) does not resolve (race with a 100 ms timeout);
  - abort rejects;
  - a missing element resolves with a warning.
- **VALIDATE**: `pnpm --filter @web-agents/core test`

### 10. UPDATE `packages/core/src/index.ts`

- **IMPLEMENT**:
  - Export `defineWebTool, toModelContextTool, registerWebTool, WebToolInputError, createToolRegistry, matchPath, toToolResult, errorResult, RESPONSE_GRACE_MS`.
  - Export the types `WebTool, WebToolConfig, WebToolContext, ToolRegistry, Register`.
  - Keep `CONFIRM`/`TARGET` internal (not exported).
- **VALIDATE**: `pnpm --filter @web-agents/core build && grep -q "defineWebTool" packages/core/dist/index.d.mts && echo ok`

### 11. CREATE `packages/react` scaffold

- **IMPLEMENT** — mirror `packages/core` (from Phase 1) exactly:
  - `package.json`:
    - `"name": "@web-agents/react"`, `"type": "module"`, `"sideEffects": false`;
    - `exports` with `".": { "@web-agents/source": "./src/index.ts", "types": "./dist/index.d.mts", "import": "./dist/index.mjs" }`;
    - `peerDependencies: { "react": ">=18" }`, `dependencies: { "@web-agents/core": "workspace:*" }`;
    - devDependencies: `react`, `react-dom`, `@types/react`, `@types/react-dom` (19.3), `vitest`, `@vitest/browser-playwright`, `vitest-browser-react`, `@web-agents/polyfill: workspace:*`, `zod`;
    - scripts `build: tsdown`, `dev: tsdown --watch`, `typecheck: tsc --noEmit`, `test: vitest run`.
  - `tsdown.config.ts`: `entry: ["src/index.ts"]`, `format: "esm"`, `dts: true`, `external: ["react", "react/jsx-runtime", "@web-agents/core"]`, `publint: true`.
  - `vitest.config.ts`:
    - browser mode, chromium, `include: ["src/**/*.browser.test.tsx"]`;
    - plugin `@vitejs/plugin-react`;
    - `resolve.conditions: ["@web-agents/source"]` so tests hit core's source.
  - `tsconfig.json` extends `../../tsconfig.base.json`, `"jsx": "react-jsx"`, `include: ["src"]`.
- **PATTERN**: `packages/core/package.json`, `packages/core/tsdown.config.ts`, `packages/core/vitest.config.ts` (Phase 1)
- **GOTCHA**: `sideEffects: false` would drop `jsx.ts` if it were imported for side effects. It must be **type-only** (`declare module`) and pulled in via `export type {} from "./jsx"` in `index.ts`, so the `.d.mts` carries it.
- **VALIDATE**: `pnpm install && pnpm --filter @web-agents/react typecheck`

### 12. CREATE `packages/react/src/jsx.ts` (MOVE from the app)

- **IMPLEMENT**: Move the `declare module "react" { interface HTMLAttributes<T> {...} }` block verbatim from `apps/playground/src/jsx-webmcp.d.ts` (originally `src/types/webmcp.d.ts:106-115`). Add `export {}`. Delete the app file.
- **GOTCHA**: The augmentation only applies when a consumer's compilation imports `@web-agents/react` types. Verify that `apps/playground` still typechecks `toolname` on `<form>` after the deletion.
- **VALIDATE**: `pnpm --filter @web-agents/react build && grep -q "toolname" packages/react/dist/index.d.mts && pnpm --filter playground typecheck`

### 13. CREATE `packages/react/src/use-pathname.ts`

- **IMPLEMENT**:
  - A `useSyncExternalStore` hook.
  - `subscribe`: if `globalThis.navigation?.addEventListener` exists, listen to `currententrychange`; always also listen to `popstate`. Return the unsubscribe.
  - `getSnapshot = () => location.pathname`; `getServerSnapshot = () => "/"`.
- **GOTCHA**:
  - Don't monkey-patch `history.pushState`. Document that routers without Navigation API support (Firefox < 147 / older Safari) should pass `pathname`.
  - Type `navigation` via `(globalThis as { navigation?: EventTarget }).navigation`.
- **VALIDATE**: `pnpm --filter @web-agents/react typecheck`

### 14. CREATE `packages/react/src/context.ts` + `provider.tsx`

- **IMPLEMENT**:
  - `WebAgentsContextValue = { registry: ToolRegistry; visuals: AgentVisuals | null; pathname: string }`.
  - `useWebAgents()` throws `"useWebAgents must be used inside <WebAgentsProvider>"` outside the provider.
  - `WebAgentsProvider({ tools = [], global = [], routes = {}, pathname, visuals = {}, context, children })`:
    1. `const visualsRef = useRef<AgentVisuals | null>(null)`; `ensureVisuals = () => { if (visuals !== false && !visualsRef.current && typeof document !== "undefined") visualsRef.current = installAgentVisuals(visuals) }`.
    2. `const contextRef = useRef(context); contextRef.current = context;` (fresh every render, read lazily by tools).
    3. `const [registry] = useState(() => createToolRegistry(tools, { beforeRegister: ensureVisuals, context: () => contextRef.current }))`.
    4. `useEffect(() => registry.update(tools), [tools])`. Document "memoise `tools` or define it at module level".
    5. `useLayoutEffect(() => { ensureVisuals(); return () => { visualsRef.current?.destroy(); visualsRef.current = null } }, [])`. Use `useIsomorphicLayoutEffect` (`typeof window === "undefined" ? useEffect : useLayoutEffect`).
    6. `useEffect` keyed on the visuals spotlight/yield options: call `visualsRef.current?.setSpotlight(...)` / `setYieldToUser(...)` when they change after mount.
    7. `const current = pathname ?? usePathname()`. Call the hook unconditionally and pick the prop if defined (rules of hooks).
    8. `const scoped = useMemo(() => [...global, ...Object.entries(routes).filter(([p]) => matchPath(p, current)).flatMap(([, n]) => n)], [global, routes, current])`; then `useEffect(() => registry.enable(scoped), [registry, scoped.join("\u0000")])`.
    9. `useEffect(() => () => registry.destroy(), [registry])`, deferred through `deferRelease` so the StrictMode remount reuses it (cancel in the setup).
  - Provide `{ registry, visuals: visualsRef.current, pathname: current }` through context.
- **GOTCHA**:
  - Child effects run **before** parent effects. A `useEnableTools` in a child calls `registry.enable` → `beforeRegister` → `ensureVisuals()` *before* the provider's own layout effect. That is exactly why install is lazy via `beforeRegister`, and why `ensureVisuals` is idempotent.
  - Keep `visuals: false` working: no install, and tools register un-animated.
  - No DOM access during render. Everything lives in effects or behind `typeof document`.
- **VALIDATE**: `pnpm --filter @web-agents/react typecheck`

### 15. CREATE `use-enable-tools.ts`, `use-web-tool.ts`, `use-tool-answer.ts`, `use-agent-events.ts`

- **IMPLEMENT**:
  - `useEnableTools(names: readonly string[])` runs `useEffect(() => useWebAgents().registry.enable(names), [key])`, keyed by `names.join("\u0000")`. Read the registry outside the effect.
  - `EnableTools({ names })` calls `useEnableTools(names)` and returns `null`.
  - `useWebTool(tool, { enabled = true } = {})`:
    - `latest = useRef(tool); latest.current = tool`;
    - `signature = JSON.stringify([tool.id, tool.description, tool.jsonSchema, tool.annotations ?? null, !!tool.requireConfirmation, tool.target ?? null])`;
    - in `useEffect` keyed on `[signature, enabled]`: if not enabled, return; build `proxy = defineWebTool({ ...tool, execute: (i, c) => latest.current.execute(i, { ...c, context: ctx?.contextRef }) })`. Use the provider context if present. It is **optional**: `useWebTool` must also work without a provider, calling `installAgentVisuals()`'s guard rule in the docs only;
    - register through `ctx ? ctx.registry … : registerWebTool(proxy)`, then release via `deferRelease` on cleanup with the same in-flight + grace protection. Implement a small `trackInflight(proxy)` helper shared with the registry (export it internally from core as `withInflight`; add to core in this task).
    - Return `{ registered: boolean, supported: boolean }` (parity with `use-webmcp-tool`'s `WebMCPState`).
  - `useToolAnswer()` is the **move** of `useAnswerGrace` (same body; import `RESPONSE_GRACE_MS` from core). Export the alias `useAnswerGrace` as `@deprecated`.
  - `useAgentEvents(listener)` keeps the listener in a ref and runs `useEffect(() => onAgentEvent(e => ref.current(e)), [])`.
- **GOTCHA**:
  - `defineWebTool` throws for bad schemas. In `useWebTool`, call it in render so the error surfaces at the component boundary, not inside an effect.
  - `tool.jsonSchema` is memoised per WebTool object, but a `defineWebTool` call inside render creates a new object each render. The signature string makes re-registration identity-independent. Recommend `useMemo` in the docs.
- **VALIDATE**: `pnpm --filter @web-agents/react typecheck`

### 16. CREATE `packages/react/src/index.ts`

- **IMPLEMENT**:
  - Export `WebAgentsProvider, useWebAgents, useEnableTools, EnableTools, useWebTool, useToolAnswer, useAnswerGrace, useAgentEvents, usePathname`.
  - Add `export type {} from "./jsx"`.
  - Re-export the convenience items `defineWebTool` and `type WebTool` from core, so apps need a single import for the common path.
- **VALIDATE**: `pnpm --filter @web-agents/react build`

### 17. CREATE react tests

- `provider.browser.test.tsx` (vitest-browser-react `render`, polyfill installed in `beforeAll`):
  1. `<React.StrictMode><WebAgentsProvider tools={cat} global={["a"]}>` → `getTools()` contains `a` exactly once, and `toolchange` fired exactly once.
  2. With `routes={{"/orders": ["b"]}}` and `pathname="/"`, `b` is absent. Rerender with `pathname="/orders"` → present. Back to `/` → absent after 20 ms.
  3. `<EnableTools names={["c"]}/>` mounts → present; unmount → gone.
  4. Two `<EnableTools names={["c"]}/>`, unmount one → still present.
  5. Visuals are installed: `document.querySelector(".agent-cursor")` exists after running a tool with an on-screen `toolname` element.
  6. `context` prop reaches `execute` (`ctx.context`).
- `use-web-tool.browser.test.tsx`:
  1. A component with state `count` registers a tool returning `count`. Click a button to increment, then `executeTool` → returns the **new** count (fresh closure) and no re-registration happened (count `toolchange`).
  2. Change `description` → exactly one re-registration.
  3. `enabled={false}` → absent.
  4. A tool with `requireConfirmation`: `executeTool` stays pending until `userEvent.click(button)`, then resolves; the button's `onClick` spy is not called.
- **VALIDATE**: `pnpm --filter @web-agents/react test`

### 18. UPDATE `apps/playground` (proof of the APIs)

- **IMPLEMENT**:
  1. `package.json`: add `"@web-agents/react": "workspace:*"` and `zod`; **remove** `use-webmcp-tool`.
  2. `src/tools/ClearCartButton.tsx`:
     - replace `useWebMCP` with
       ```ts
       const tool = useMemo(() => defineWebTool({ id:"clear_cart", description:"Remove every item from the shopping cart", annotations:{ destructiveHint:true }, requireConfirmation:true, execute: () => cart.clear() }), [cart]);
       useWebTool(tool, { enabled: cart.items.length > 0 });
       ```
     - keep `toolname="clear_cart"` on the button;
     - update the file header comment: "imperative WebTool; destructive, so the user confirms on the button".
  3. `src/tools/catalog.ts` (module-level, `declare module "@web-agents/core" { interface Register { context: CartApi } }`):
     - `get_cart`: readOnly, no input; returns a text summary from `ctx.context!.items/totals`;
     - `remove_promo`: `target: '[toolname="remove_promo"]'`, execute `ctx.context!.removePromo()`;
     - `list_orders`: readOnly; returns the orders as JSON text.
  4. `src/App.tsx`:
     - wrap in `<WebAgentsProvider tools={catalog} global={["get_cart"]} routes={{ "/orders": ["list_orders"] }} pathname={path} context={cart} visuals={{ spotlight: true, log: … }}>`.
     - **Reorder**: `CartProvider` must be outside, so `context={cart}` needs a small `Shell` component that reads `useCart()` and renders the provider.
     - In `Totals` (lines 18-27), add `toolname="remove_promo"` to the Remove button and render `<EnableTools names={["remove_promo"]} />` inside the promo row (component-scoped).
     - Add a two-tab nav (`Shop` / `Orders`) that uses `history.pushState` + a `usePathname()` from `@web-agents/react`, rendering `<Orders/>` at `/orders`.
  5. `src/main.tsx`: remove the `installAgentVisuals` block (the provider installs it now). Keep the polyfill import first and the devtools (Phase 1 console) after render. The console's Spotlight switch gets the controller from a module-level `let visuals` set via the `useWebAgents()` value. Simplest is to keep a `visualsRef` export from `App`, or defer the toggle to Phase 3 and drop the switch here; note the choice in the commit.
  6. Delete `src/jsx-webmcp.d.ts`. Delete `src/tools/useAnswerGrace.ts` and import `useToolAnswer` from `@web-agents/react` in `ApplyPromoForm.tsx` / `CheckoutForm.tsx`.
  7. `vite.config.ts`: needs no change if Phase 1 already sets `resolve.conditions` for `@web-agents/source`. Verify.
- **GOTCHA**:
  - Vite SPA: `/orders` reload needs history fallback. Vite dev serves `index.html` for unknown paths by default. Confirm it.
  - Declarative forms keep working untouched. They don't go through the registry.
- **VALIDATE**: `pnpm --filter playground typecheck && pnpm --filter playground build`

### 19. UPDATE docs

- **IMPLEMENT**:
  - Root `README.md`: add a "React" section with a provider + `useEnableTools` + `defineWebTool` example, and replace the `use-webmcp-tool` example (README lines "An imperative tool (via `use-webmcp-tool`)…").
  - Add a `packages/react/README.md` (install, provider props table, hooks, StrictMode/route behaviour, `Register` augmentation).
  - Update the roadmap contract (`Register`, `context`, `ToolRegistry.update`).
- **VALIDATE**: `pnpm biome check README.md packages/react/README.md` (or `pnpm lint`)

---

## TESTING STRATEGY

### Unit Tests

- Node (`*.test.ts`): `path-match`, `web-tool` (schema derivation, validation, error results, abort, string args), `deferred` (fake timers: `vi.useFakeTimers()`), type-level alignment (`expectTypeOf`).
- Pure functions get table-driven tests (`it.each`).

### Integration Tests

- Vitest **browser mode** (chromium via `@vitest/browser-playwright`) with `@web-agents/polyfill` installed in `beforeAll`. Real `document.modelContext` semantics, real layout for visuals.
- React integration through `vitest-browser-react`'s `render`, wrapped in `<React.StrictMode>` by default to exercise double effects.
- Trusted input through `userEvent` from `vitest/browser`. This is required for confirmation and yield tests, because `el.click()` is untrusted.

### Edge Cases

- StrictMode mount → unmount → mount: exactly one registration, zero `toolchange` churn, visuals not torn down.
- Route change while a call is in flight: the tool stays registered until settle + 500 ms, and the call is not cancelled.
- The same tool enabled by both a route and a component: unmounting the component keeps it on.
- Unknown tool names in `routes`/`global`/`useEnableTools`: a warning listing the catalog, no throw.
- Duplicate catalog ids: throws at provider creation.
- Schema lacking Standard JSON Schema (a mock `~standard` without `jsonSchema`): a helpful TypeError.
- `requireConfirmation` with the target missing from the DOM: resolves with a warning (no hang).
- Synthetic `click()` must not confirm.
- No `document.modelContext` (polyfill not installed): `registerWebTool` warns once, the app renders, nothing throws.
- SSR import: `node -e "import('@web-agents/react')"` must not touch `document`/`window`.
- `visuals={false}`: no cursor DOM nodes are created.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm lint                      # biome check .
pnpm typecheck                 # turbo run typecheck (all packages + apps)
```

### Level 2: Unit Tests

```bash
pnpm --filter @web-agents/core test
```

### Level 3: Integration Tests

```bash
pnpm --filter @web-agents/react test
pnpm test                      # turbo run test — whole repo, must stay green
pnpm build                     # turbo run build — tsdown dts includes JSX augmentation + defineWebTool
node -e "import('./packages/react/dist/index.mjs').then(m=>console.log(Object.keys(m).sort().join(',')))"   # SSR-safe import
```

### Level 4: Manual Validation

`pnpm --filter playground dev`, then use the `agent-browser` skill (`agent-browser open http://localhost:5173`):

1. `await agent.list()` in the console: `get_cart` is present on `/`; `list_orders` is absent; `clear_cart` is absent while the cart is empty.
2. Add an item → `clear_cart` appears. `agent.run("clear_cart")` → the cursor glides to "Clear cart" and **parks** with "Click "Clear cart" to confirm". A real click clears the cart once (not twice), and the agent result is "Cart cleared.".
3. Apply promo `123` → `remove_promo` appears (component-scoped). `agent.run("remove_promo")` → the cursor clicks Remove, and the tool disappears ~0.5 s later without a cancellation error.
4. Switch to the Orders tab → `list_orders` appears and `get_cart` is still present. Switch back → `list_orders` disappears.
5. Moving the real mouse during a run hides the cursor (Phase 1 behaviour still intact).
6. React DevTools "Highlight updates": the provider does not re-render the whole tree on tool changes.

### Level 5: Additional Validation (Optional)

- Run the `react-doctor` skill on `packages/react` and `apps/playground`.
- Run the `e2e-test` skill against the playground.

---

## ACCEPTANCE CRITERIA

- [ ] `defineWebTool` accepts zod 4 schemas and plain JSON Schema; `jsonSchema` is draft-07 without `$schema`; invalid input yields an `isError` result naming the field
- [ ] A WebTool is structurally assignable to a Mastra-style `createTool` config (type test passes)
- [ ] `<WebAgentsProvider>` supports `tools`, `global`, `routes`, `pathname`, `visuals`, `context`; installs visuals before the first registration
- [ ] `useEnableTools` / `<EnableTools>` register on mount, unregister on unmount, ref-counted
- [ ] No `toolchange` churn and no cancelled calls under StrictMode or route swaps during in-flight calls
- [ ] `requireConfirmation` parks the cursor and only a trusted user click confirms; the app handler doesn't double-run
- [ ] `useWebTool` always executes the latest closure; re-registers only on definition change
- [ ] JSX attribute types ship from `@web-agents/react`; the playground no longer has its own copy or `use-webmcp-tool`
- [ ] Playground demonstrates global, route-scoped, component-scoped and confirmation tools
- [ ] All validation commands pass; core stays within the roadmap size budget (`≤ 9 KB` min+gz)
- [ ] Roadmap contract updated (`Register`, `ctx.context`, `ToolRegistry.update`)

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability (`/code-review`, `/simplify`)

---

## NOTES

- **Why core owns WebTool and the registry**: the chat (Phase 5) and devtools (Phase 3) packages need them without React. Keeping them framework-agnostic also allows a later Vue/Svelte binding.
- **Why not `URLPattern`**: uneven availability, and we only need `:param` and `*`.
- **Why a `Register` interface for `context`**: module-level catalog tools need app state without React closures. This is the TanStack Router `Register` pattern: zero runtime cost, full type safety. Component-bound tools use `useWebTool`, which closes over state directly.
- **Why confirmation lives in `execute` rather than in visuals**: confirmation must work with `visuals: false` too. Visuals only changes the choreography (park vs click).
- **`use-webmcp-tool`**: no longer used by our packages. Interop still works because visuals wraps `registerTool` regardless of who calls it. Mention this in the README.
- **Deferred teardown is the key correctness trick.** If anything flakes, look at `deferRelease` usage first.
- **Risk**: `vitest-browser-react` version compatibility with Vitest 5 — confirm with `npm view vitest-browser-react peerDependencies`. Fallback: `react-dom/client` `createRoot` + `act` manually.

**Confidence score: 7.5/10** for one-pass success. Main uncertainties are the exact Standard JSON Schema typings in `@standard-schema/spec` 1.1, the interaction between deferred visuals teardown and Phase 1's `destroy()` implementation, and `vitest-browser-react` + Vitest 5 compatibility.
