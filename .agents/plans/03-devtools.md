# Feature: `@web-agents/devtools` — WebMCP devtools panel + TanStack Devtools plugin (Phase 3)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> Read first: `.agents/plans/00-web-agents-roadmap.md` (contracts and versions) and `02-react-provider-webtool.md`
> (`useWebAgents()` exposes `{ registry, visuals, pathname }`). This plan assumes Phases 1 and 2 are merged. File refs give
> the **current path:line** and the **post-Phase-1 path** (`→`). Locate code by quoted snippet if lines have shifted.

## Feature Description

The panel replaces the dev-only "agent console" (`dev/agent-console.ts` → `packages/devtools/src/console.ts`). It is a
polished devtools panel, inspired by TanStack Devtools, that makes WebMCP tools easy to see, run and debug:

- **Tools**:
  - live list of every registered tool, refreshed on `toolchange`, with search;
  - kind badge (declarative form / imperative), annotations (read-only, destructive, confirm), and whether it's on screen;
  - **Locate** (scroll to its `toolname` element and flash it).
- **Runner**: a hand-rolled **JSON-Schema form** with:
  - string, enum (select), number/integer (with min/max), boolean, nested object, array (add/remove rows);
  - a **Form ⇄ JSON** toggle (raw JSON fallback for anything unsupported);
  - Run, Cancel and **Copy as code** (`await agent.run("name", {...})`).
- **Timeline**: every call, from the devtools *or* from a real agent. Each entry has args, field fills, the park (waiting-for-user) state, the result or error, a duration bar, and re-run.
- **Settings**: Spotlight and Yield-to-user toggles wired to the visuals controller, plus dock position and size, persisted.
- **Hosts**:
  1. `installWebAgentsDevtools()`: vanilla, floating launcher + panel in a Shadow DOM.
  2. `<WebAgentsDevtools />` (React): the same UI, auto-wired to `useWebAgents()`.
  3. `webAgentsDevtoolsPlugin()`: a **TanStack Devtools** custom plugin, so users already on `@tanstack/react-devtools` get a "Web Agents" tab.

## User Story

As a developer building agent-ready pages
I want to see which tools are live on the current screen, run them with a generated form, and watch every call's timeline
So that I can debug tools and agent behaviour without writing JSON by hand or reading console logs

## Problem Statement

- The current console (`dev/agent-console.ts:63-197`) has several gaps:
  - It is an `innerHTML` panel with a single-line JSON textarea per tool (`:102`).
  - Its result view is a plain text log (`:89-92`).
  - It has no history, durations or field-level detail.
  - Its pause detection is polling (`announcePause`, `:148-169`, a 150 ms interval).
  - It has no style isolation: it relies on the app's `app.css`.
- Agent-originated calls (a real Chrome agent, or Phase 5 chat) are invisible except through `console.debug` (`src/main.tsx:15`).
- TODO #3 asks for a TanStack-inspired devtools with "visual JSON schema to simplify how to run".

## Solution Statement

- A framework-agnostic **devtools store** (`createDevtoolsStore`) aggregates:
  - `document.modelContext.getTools()` on `toolchange`;
  - core `onAgentEvent` (start, fill, park, result, error, cancel, yield);
  - its own `runTool()`, which wraps `executeTool` with the Chrome-150/156 argument-shape fallback ported from the console.
  
  It exposes `subscribe`/`getSnapshot` for `useSyncExternalStore`.
- The UI is **React** (`react`/`react-dom` are peer deps; the tool is dev-only, so size matters less). It renders into a **Shadow DOM** root with a constructable stylesheet (`adoptedStyleSheets`), giving full style isolation in every host.
- The vanilla host mounts the React UI with `createRoot` into its own shadow root. The React host and the TanStack plugin portal into a shadow root created inside their container.
- An optional `EventClient` bridge (`@tanstack/devtools-event-client`, pluginId `web-agents`) re-emits store events for TanStack's bus. **Core never imports TanStack.**
- **Core change.** User-yield (Phase 1 `user-yield.ts`) ignores input originating inside `[data-web-agents-ui]` hosts. Without it, clicking "Run" in the panel (a trusted pointer event) would immediately hide the cursor for that run. The Phase 5 chat widget uses the same attribute.

## Feature Metadata

**Feature Type**: New Capability (replaces the dev console)
**Estimated Complexity**: Medium-High
**Primary Systems Affected**:
- `packages/devtools` (rewrite)
- `packages/core/src/user-yield.ts` (ignore UI hosts)
- `packages/core/src/cursor.css` (z-index token)
- `apps/playground/src/main.tsx`

**Dependencies**:
- `react >=18`, `react-dom >=18` (peers)
- `@tanstack/devtools-event-client@^0.5.1` (dependency, tiny)
- `@tanstack/react-devtools@^0.10.14` (**optional** peer; dev dep for tests and the playground)
- Confirm all with `npm view <pkg> version`.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `dev/agent-console.ts` → `packages/devtools/src/console.ts`. Its logic is ported, its UI replaced.
  - (lines 7-12, 14-15) `SchemaProperty`, `exampleFrom()`: the "e.g." sample extraction. Keep it for form defaults.
  - (lines 17-25) `parseSchema()`: Chrome returns `inputSchema` as a JSON **string**, the polyfill as an object.
  - (lines 27-39) `defaultArgs()`: the defaults policy (`minimum ?? 1`, `true`, first enum, example).
  - (lines 41-55) `normalizeResult()`: a Chrome JSON-string result versus a polyfill result object.
  - (lines 122-146) `execute()` with the `argsAs` object/string fallback and the regexes that detect the wrong shape. **Port verbatim.**
  - (lines 148-169) `announcePause()`: replaced by the core `park` event (no polling).
  - (lines 171-192) `run()`: `"Error:"`-prefix failure detection (`:186`), because declarative tools can't set `isError`.
  - (lines 194-196) `toolchange` → re-render; `window.agent = { run, list }`. **Keep `window.agent` for back-compat** (the README documents it).
- `src/agent-visuals/index.ts` → `packages/core/src/visuals.ts`
  - (lines 28-33) the `AgentVisualsLogEntry` union, now `AgentEvent` in `events.ts` (roadmap contract).
  - (lines 51-61) the `AgentVisuals` controller: `setSpotlight`, and in Phase 1 `setYieldToUser` and `destroy`.
  - (lines 140-147) `submitButtonOf`/`pausedSubmitOf`: the declarative-tool detection pattern (`form[toolname]`).
- `src/agent-visuals/cursor.css:1-14` → `packages/core/src/cursor.css`. `--agent-z: 2147483000`. The devtools must sit **above** the spotlight layer: use `calc(var(--agent-z, 2147483000) + 100)`.
- `packages/core/src/user-yield.ts` (Phase 1): trusted pointer/keyboard/wheel/touch listeners. Add the UI-host exclusion here.
- `packages/core/src/events.ts` (Phase 1): `onAgentEvent(listener): () => void`.
- `packages/react/src/context.ts` (Phase 2): `useWebAgents()` returns `{ registry, visuals, pathname }`; there is also an optional non-throwing variant. **Add `useOptionalWebAgents()` returning `null` outside a provider** in this phase.
- `src/main.tsx:28-34` → `apps/playground/src/main.tsx`: how the console is installed (DEV-only dynamic import). Mirror that for devtools.
- `src/types/webmcp.d.ts:12-19, 49-80` → `packages/core/src/webmcp.ts`: `ModelContextToolInfo`, `executeTool` overloads, `cancelTool?` (polyfill only).

### New Files to Create

- `packages/devtools/src/store.ts`: `createDevtoolsStore({ mc?, now? })`: tools, calls, settings; `runTool`, `cancel`, `locate`, `subscribe`, `getSnapshot`, `destroy`
- `packages/core/src/execute.ts`: `executeTool()`, `normalizeToolResult()` (ported from console.ts; shared with Phase 5 chat)
- `packages/devtools/src/schema.ts`: `parseSchema()` (ported)
- `packages/devtools/src/schema-form/defaults.ts`: `defaultValueFor(schema)`, `exampleFrom()` (ported)
- `packages/devtools/src/schema-form/coerce.ts`: `coerce(schema, raw)` for number/integer/boolean inputs
- `packages/devtools/src/schema-form/SchemaForm.tsx`: renderer (`ObjectField`, `ArrayField`, `PrimitiveField`, JSON fallback)
- `packages/devtools/src/ui/Panel.tsx`, `ToolList.tsx`, `ToolRunner.tsx`, `Timeline.tsx`, `CallDetail.tsx`, `Settings.tsx`, `Launcher.tsx`, `JsonView.tsx`
- `packages/devtools/src/ui/styles.ts`: CSS as a template string → `CSSStyleSheet`
- `packages/devtools/src/ui/ShadowRoot.tsx`: `<ShadowHost>` creates host `div[data-web-agents-ui]` + `attachShadow`, adopts styles, portals children
- `packages/devtools/src/vanilla.tsx`: `installWebAgentsDevtools(options)`
- `packages/devtools/src/react.tsx`: `<WebAgentsDevtools />`, `webAgentsDevtoolsPlugin()`
- `packages/devtools/src/event-client.ts`: `webAgentsEventClient` (TanStack `EventClient`) + `bridgeStoreToEventClient(store)`
- `packages/devtools/src/copy-as-code.ts`: `toAgentRunCode(name, args)`, `toExecuteToolCode(name, args)`
- Tests:
  - `packages/devtools/src/schema-form/defaults.test.ts`, `coerce.test.ts`, `copy-as-code.test.ts` (node)
  - `packages/devtools/src/store.browser.test.ts`
  - `packages/devtools/src/ui/Panel.browser.test.tsx`
  - `packages/devtools/src/react.browser.test.tsx`
- Delete: `packages/devtools/src/console.ts` (after the port)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [TanStack Devtools: custom plugins (React)](https://tanstack.com/devtools/latest/docs/framework/react/guides/custom-plugins)
  - The plugin object shape (`{ name, render }`, render as JSX or a function receiving the container/theme). Verify the exact current signature; it is 0.x.
  - Why: `webAgentsDevtoolsPlugin()`.
- [TanStack Devtools architecture / event client](https://tanstack.com/devtools/latest/docs/architecture#package-dependency-graph)
  - `EventClient<EventMap>` with `pluginId`, `emit`, `on`.
  - Why: the optional bridge.
- [TanStack Devtools production builds](https://tanstack.com/devtools/latest/docs/production)
  - The root import no-ops in production unless imported from `/production`. Verify the URL path in the docs sidebar.
- [Constructable stylesheets / adoptedStyleSheets](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/adoptedStyleSheets)
  - Why: style isolation without bundler CSS support (tsdown CSS is experimental).
- [React createPortal](https://react.dev/reference/react-dom/createPortal) and [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [Clipboard API writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
  - Why: copy-as-code; needs a secure context and a user gesture.
- [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) and [disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
  - Why: the Tools / Timeline / Settings tabs and the expandable call rows.
- [Chrome WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api#discover-tools)
  - The `getTools()` fields (`title`, `annotations`, `origin`). `executeTool` resolves `null` when the call navigates.

### Patterns to Follow

**Port, don't reinvent: the arg-shape fallback** (`dev/agent-console.ts:128-146`):
```ts
let argsAs: "object" | "string" = "object";
async function execute(tool: ModelContextToolInfo, args: Record<string, unknown>) {
  const call = (shape: typeof argsAs) => mc!.executeTool(tool, shape === "object" ? args : JSON.stringify(args));
  try { return await call(argsAs); } catch (err) {
    const message = String((err as Error)?.message ?? err);
    const other = argsAs === "object" ? "string" : "object";
    const wrongShape = argsAs === "object" ? /parse input string as JSON|not of type 'DOMString'/i : /not an object|invalid input object/i;
    if (!wrongShape.test(message)) throw err;
    argsAs = other; return call(argsAs);
  }
}
```

**Failure detection for declarative tools** (`dev/agent-console.ts:184-186`):
```ts
// Declarative tools can't set isError; this demo's handlers prefix failures with "Error:".
const failed = res.isError || /^Error:/.test(text);
```

**Defaults policy** (`dev/agent-console.ts:27-39`):
```ts
p.type === "integer" || p.type === "number" ? (p.minimum ?? 1) : p.type === "boolean" ? true : (p.enum?.[0] ?? exampleFrom(p.description))
```

**Escaping.** There is no `innerHTML` with tool data anywhere in the new UI. React escapes by default. The current console needs `escapeHtml` (`:57-58`); the new code must never reintroduce `dangerouslySetInnerHTML`.

**Event subscription returns a disposer.** Use `onAgentEvent(listener): () => void` (roadmap contract), and collect every disposer in `destroy()`. This mirrors the Phase 1 visuals teardown with an `AbortController`.

**Comment and naming style:**
- block doc comment at file top explaining *why*;
- constants carry units (`PAUSE_POLL_MS` → gone; `MAX_CALLS = 200`);
- kebab-case files for non-components, PascalCase `.tsx` for components.

**Visual language.** Neutral, dense, dev-tool: monospace for names, args and JSON; system sans for chrome; 12–13 px base. One accent equal to the agent colour token (`--agent`). Load the `stealth`, `type`, `space` and `surface` skills before styling.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

- Core: user-yield ignores `[data-web-agents-ui]`.
- Port the pure logic (`execute.ts`, `defaults.ts`) from the console, with node tests.
- `coerce.ts`, `copy-as-code.ts`.

### Phase 2: Core implementation

- `store.ts`: tools, calls (merging devtools-originated and agent-originated), settings with `localStorage` persistence, `runTool`/`cancel`/`locate`.
- Schema form.
- UI components inside a Shadow DOM host.

### Phase 3: Integration

- Vanilla host `installWebAgentsDevtools`, React host `<WebAgentsDevtools />`, TanStack plugin, EventClient bridge.
- `package.json` exports: `"."` (vanilla + store) and `"./react"`.
- Playground switches from the console to `<WebAgentsDevtools />` + the optional TanStack plugin demo; delete `console.ts`.

### Phase 4: Testing & validation

- Node unit tests, browser-mode store + UI tests, agent-browser manual pass, `react-doctor`, a11y pass.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 1. UPDATE `packages/core/src/user-yield.ts`

- **IMPLEMENT**: Phase 1 already ships this (`YieldOptions.ignore`, default `[data-web-agents-ui]`, and the
  `UI_HOST_ATTR` export). **Verify only**: `grep -n "UI_HOST_ATTR" packages/core/src/index.ts`. If it is missing,
  implement it as specified in Phase 1 task 16 and add test case 8 there.
  - Also CREATE `packages/core/src/execute.ts` with `executeTool()` and `normalizeToolResult()` (roadmap contract),
    ported verbatim from `console.ts` `execute()` / `normalizeResult()` plus `null`-on-navigation and abort →
    `cancelTool?.(name)`. Export both from core's `index.ts`. Devtools imports them; Phase 5 reuses them.
- **PATTERN**: the Phase 1 listener structure in `user-yield.ts` (passive, capture, `isTrusted` check)
- **GOTCHA**: Keep it O(path length). `composedPath()` is cheap. Don't call `closest` per event on deep trees.
- **VALIDATE**: add a case to the Phase 1 `user-yield.browser.test.ts`: a trusted `userEvent.hover` over an element inside `div[data-web-agents-ui]` during a run does **not** hide the cursor. Run `pnpm --filter @web-agents/core test -- user-yield`.

### 2. UPDATE `packages/core/src/cursor.css`

- **IMPLEMENT**: Document `--agent-z` as the base layer, and add a `/* devtools and chat render at calc(var(--agent-z) + 100) */` comment. No behaviour change.
- **VALIDATE**: `pnpm --filter @web-agents/core build`

### 3. UPDATE `packages/devtools/package.json`, `tsdown.config.ts`, `vitest.config.ts`

- **IMPLEMENT**:
  - `exports`:
    - `"."`: `{ "@web-agents/source": "./src/index.ts", "types": "./dist/index.d.mts", "import": "./dist/index.mjs" }`
    - `"./react"`: `{ "@web-agents/source": "./src/react.tsx", "types": "./dist/react.d.mts", "import": "./dist/react.mjs" }`
  - `peerDependencies: { "react": ">=18", "react-dom": ">=18", "@tanstack/react-devtools": ">=0.10" }` with `peerDependenciesMeta: { "@tanstack/react-devtools": { "optional": true } }`.
  - `dependencies: { "@web-agents/core": "workspace:*", "@tanstack/devtools-event-client": "^0.5.1" }`.
  - `devDependencies`: react 19.3, react-dom, `@types/react*`, `@tanstack/react-devtools`, `@web-agents/polyfill`, `@web-agents/react`, `vitest`, `@vitest/browser-playwright`, `vitest-browser-react`, `@vitejs/plugin-react`.
  - tsdown: `entry: ["src/index.ts", "src/react.tsx"]`, `external: [/^react/, /^@tanstack\//, /^@web-agents\//]`, `dts: true`.
  - vitest: two projects:
    - `node` for `src/**/*.test.ts`;
    - `browser` (chromium) for `src/**/*.browser.test.{ts,tsx}`, with `@vitejs/plugin-react` and `resolve.conditions: ["@web-agents/source"]`.
- **PATTERN**: `packages/react/package.json` (Phase 2)
- **GOTCHA**: `@web-agents/react` is only a **dev**/optional dependency. `src/react.tsx` uses `useOptionalWebAgents` from it, so declare `@web-agents/react` as an **optional peer** too, or the published `./react` entry breaks. Decide: make `@web-agents/react` a peer (optional) of devtools. Document it.
- **VALIDATE**: `pnpm install && pnpm --filter @web-agents/devtools typecheck`

### 4. CREATE `packages/devtools/src/execute.ts`

- **IMPLEMENT**:
  - Port `parseSchema` (`console.ts:17-25`) here. The executor itself is **core's** `executeTool()` /
    `normalizeToolResult()` from task 1 (shared with the Phase 5 chat); this file only wraps it:
    `run(name, args, { signal })` → `executeTool(...)`.
  - Handle `null`: Chrome resolves `null` when the call triggers a navigation. Map it to `{ content: [{ type: "text", text: "(navigated)" }] }` here, for display only (core passes `null` through).
  - Add `isFailure(res)` = `res.isError || /^Error:/.test(textOf(res))`.
- **VALIDATE**: `pnpm --filter @web-agents/devtools typecheck`

### 5. CREATE `schema-form/defaults.ts`, `schema-form/coerce.ts`, `copy-as-code.ts` + node tests

- **IMPLEMENT**:
  - `defaultValueFor(schema)` (recursive):
    - object → each property's default;
    - array → `[]`;
    - `schema.default` wins;
    - otherwise the console's policy (`:27-39`).
  - `exampleFrom` is ported verbatim (`:15`).
  - `coerce(schema, raw: string)`:
    - integer → `Number.parseInt`, number → `Number`. Empty string → `undefined` (the field is omitted, so `required` errors surface from the tool, not the form).
    - boolean comes from a checkbox. Otherwise the string stays as-is.
  - `toAgentRunCode(name, args)` → `await agent.run(${JSON.stringify(name)}, ${JSON.stringify(args, null, 2)});`
  - `toExecuteToolCode(name, args)` → a `document.modelContext` snippet that uses `getTools()` + `executeTool(tool, args)`.
- **TESTS**:
  - `defaultValueFor` on a schema like the playground's `add_to_cart` → `{ qty: 1 }`;
  - on `apply_promo` with description "e.g. 123" → `{ code: "123" }`;
  - nested object/array;
  - `default` wins;
  - `coerce` integer "3" → 3, "" → undefined;
  - copy-as-code snapshots via `toMatchInlineSnapshot`.
- **VALIDATE**: `pnpm --filter @web-agents/devtools test -- --project node`

### 6. CREATE `packages/devtools/src/store.ts`

- **IMPLEMENT** `createDevtoolsStore({ mc = document.modelContext, visuals = null, storageKey = "web-agents-devtools", maxCalls = 200 } = {})`.
  - **State** (immutable snapshots; new object per change):
    ```ts
    interface DevtoolsState {
      tools: ToolView[];            // { name, title?, description, schema: JSONSchema, annotations, kind: "declarative"|"imperative", onScreen: boolean }
      calls: CallRecord[];          // newest first, capped at maxCalls
      settings: { open: boolean; tab: "tools"|"timeline"|"settings"; dock: "bottom"|"right"; size: number; spotlight: boolean; yieldToUser: boolean };
      supported: boolean;           // !!mc
    }
    interface CallRecord {
      id: string; tool: string; origin: "devtools" | "agent"; args?: unknown;
      fills: { field: string; value: string | boolean; at: number }[];
      status: "running" | "waiting" | "ok" | "error" | "cancelled";
      startedAt: number; endedAt?: number; result?: ModelContextToolResult; error?: string; prompt?: string;
    }
    ```
  - **Tools**:
    - `refreshTools()` runs `mc.getTools()` → map with `parseSchema`;
    - `kind = document.querySelector(\`form[toolname="${CSS.escape(name)}"]\`) ? "declarative" : "imperative"`;
    - `onScreen = !!document.querySelector(\`[toolname="${CSS.escape(name)}"]\`)`;
    - subscribe to `toolchange`, coalesced with `queueMicrotask` (many changes per React commit).
  - **Calls from devtools**: `runTool(name, args)`:
    - push `{ origin: "devtools", status: "running" }`;
    - remember `activeDevtoolsCall[name] = id` so the matching core `start` event isn't duplicated;
    - run `executor(tool, args)` → `ok`/`error` via `isFailure`;
    - an `AbortError` → `cancelled`.
  - **Calls from agents**: `onAgentEvent`:
    - `start`: if there's no active devtools call for the tool → push `{ origin: "agent" }`;
    - `fill` → append to the latest running call for that tool;
    - `park` → `status: "waiting", prompt`;
    - `result` / `error` / `cancel` → finish the latest running/waiting call for the tool. Prefer `ms` from the event for duration when the record has no `endedAt`;
    - `yield` / `resume` → append a timeline marker (`CallRecord` with `tool: "(you)"`? No: keep a separate `markers: { type, at }[]` array in state for the timeline rail).
  - `cancel(id)`: if `mc.cancelTool` exists (polyfill) → `mc.cancelTool(tool)`; otherwise abort is not available natively, so disable the button in the UI (`canCancel` flag in the snapshot).
  - `locate(name)`: `el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" })`, then add the `data-web-agents-locate` attribute for 900 ms. Its styling comes from a tiny `<style>` the store injects once into `document.head`: an outline pulse using `--agent`, with a reduced-motion variant.
  - `setSetting(key, value)`:
    - persist to `localStorage` (guard with try/catch for private mode);
    - `spotlight` → `visuals?.setSpotlight(v)`, `yieldToUser` → `visuals?.setYieldToUser(v)`;
    - if `visuals` is null, show the toggles disabled with a hint.
  - `subscribe`/`getSnapshot` (stable reference between changes).
  - `destroy()` removes every listener.
  - `window.agent = { run: (n, a) => runTool(n, a).then(r => r.result), list: () => mc.getTools() }`. Back-compat with the README. Remove it on destroy if it is still ours.
- **GOTCHA**:
  - Core events carry no call id, and a tool can be called concurrently. Correlate by tool name + "latest unfinished". That is good enough for devtools; document the limitation.
  - The polyfill emits `toolactivated` → visuals emits `start` **inside** `executeTool`. Set `activeDevtoolsCall` **before** calling `executeTool`.
  - Never hold `Element` references in state: snapshots must be serialisable for the EventClient bridge.
- **VALIDATE**: `pnpm --filter @web-agents/devtools typecheck`

### 7. CREATE `store.browser.test.ts`

- **IMPLEMENT** (polyfill + `installAgentVisuals()` in `beforeAll`; fixture DOM built per test with an autosubmit form `toolname="add_to_cart_x"` + `<input name="qty" type="number" min="1">`):
  1. The tools list populates, and `kind === "declarative"`, `onScreen === true`.
  2. `runTool("add_to_cart_x", { qty: 2 })` → one call record, `origin: "devtools"`, fills contain `qty`, status `ok`, `endedAt > startedAt`.
  3. A direct `document.modelContext.executeTool("add_to_cart_x", {qty:1})` (simulated agent) → one record with `origin: "agent"`.
  4. A non-autosubmit form → status `waiting` with a prompt, then `userEvent.click(submit)` → `ok`.
  5. `cancel()` on a waiting call → `cancelled`.
  6. Unregistering a tool (remove the form) → disappears from `tools` after a microtask.
  7. `destroy()` restores `window.agent` and stops updates.
- **VALIDATE**: `pnpm --filter @web-agents/devtools test -- store`

### 8. CREATE `ui/styles.ts` + `ui/ShadowRoot.tsx`

- **IMPLEMENT**:
  - `styles.ts` exports `const css = String.raw\`…\`` and `getSheet()`, which memoises `new CSSStyleSheet(); sheet.replaceSync(css)`.
  - Tokens:
    - `:host { all: initial; color-scheme: light dark; --wa-bg; --wa-fg; --wa-muted; --wa-border; --wa-accent: var(--agent, #111); font: 12px/1.45 system-ui; }`
    - with a `@media (prefers-color-scheme: dark)` variant;
    - mono stack `ui-monospace, SFMono-Regular, Menlo, monospace`.
  - Panel `z-index: calc(var(--agent-z, 2147483000) + 100)`.
  - Transitions only on `transform`/`opacity`, with `@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important } }`.
  - `ShadowHost({ children, className? })`:
    - `useLayoutEffect` creates `div[data-web-agents-ui]`, appends it to `document.body`, `attachShadow({ mode: "open" })`, and sets `shadowRoot.adoptedStyleSheets = [getSheet()]`;
    - render with `createPortal(children, shadowRoot)`;
    - cleanup removes the host.
  - Variant `ShadowHost inline` attaches to a provided container element instead of `body` (for the TanStack plugin container).
- **GOTCHA**:
  - `adoptedStyleSheets` is supported in all evergreen browsers. Fall back to a `<style>` element inside the shadow root if `"adoptedStyleSheets" in ShadowRoot.prototype` is false.
  - CSS custom properties from the page (`--agent`) **do** inherit into shadow trees; `all: initial` resets inherited properties but not custom properties. That is intentional.
- **VALIDATE**: `pnpm --filter @web-agents/devtools typecheck`

### 9. CREATE `schema-form/SchemaForm.tsx`

- **IMPLEMENT**: `SchemaForm({ schema, value, onChange, idPrefix })`, controlled.
  - `object` → a `<fieldset>` with `<legend>` for nested objects (top level has no fieldset); one field per property; required marked by `aria-required` + a visual `*`.
  - `string` + `enum` → `<select>`; `string` + `format: "date"` → `<input type="date">`; other strings → `<input type="text">`. `maxLength > 120` or a `description` containing "multi-line" → `<textarea>`.
  - `number`/`integer` → `<input type="number" step={integer ? 1 : "any"} min max>` with `coerce`.
  - `boolean` → checkbox.
  - `array` of primitives/objects → a list with "Add item" / "Remove" buttons (focus moves to the new row's first input).
  - Unsupported (`oneOf`/`anyOf`/`$ref`/no type) → a `JsonField` textarea for that subtree, with inline parse errors (`aria-invalid` + `aria-describedby`).
  - The `description` renders as hint text linked via `aria-describedby`.
  - Every input has a `<label htmlFor>`.
- **PATTERN**: label/description semantics mirror the polyfill's schema derivation (`dev/webmcp-polyfill.ts:107-127`: `toolparamdescription` → `description`).
- **GOTCHA**: Keep it ≤ ~250 lines. No ajv; validation is the tool's job, and errors come back in the result.
- **VALIDATE**: `pnpm --filter @web-agents/devtools typecheck`

### 10. CREATE UI components (`ui/*.tsx`)

- **IMPLEMENT** (load the `components`, `interaction`, `a11y`, `states` and `ux-copy` skills first):
  - **`Panel`**:
    - `role="dialog" aria-label="Web Agents devtools"` (non-modal, no focus trap);
    - header with an ARIA **tabs** pattern: Tools · Timeline (badge = running count) · Settings;
    - a dock toggle and a close button;
    - resizable via a drag handle (pointer events, size clamped 240–80vh, persisted);
    - `Escape` closes;
    - hotkey `Alt+Shift+A` toggles (configurable `hotkey` option; ignored while typing in the page's inputs).
  - **`Launcher`**: a 40 px round button bottom-right (`aria-expanded`), with a small dot when a call is running.
  - **`ToolList`**:
    - search input (filters by name and description);
    - rows show `name` (mono), description (one line, truncated with `title`), badges (declarative/imperative, read-only, destructive, confirm), a Locate button (disabled if not on screen) and an expand → `ToolRunner`;
    - **Empty state**: "No tools on this page yet. Add `toolname` to a form or register one with `useWebTool`."
    - **Unsupported state**: "`document.modelContext` isn't available. Import `@web-agents/polyfill/auto` in development."
  - **`ToolRunner`**:
    - Form/JSON segmented toggle, with state synced both ways (an invalid JSON keeps the last valid form value plus an error);
    - **Run** (primary, `Cmd/Ctrl+Enter`), **Cancel** (while running, if `canCancel`), **Copy as code** menu (`agent.run` | `modelContext.executeTool`), with a "Copied" `aria-live` confirmation for 1.5 s;
    - shows the last result inline.
  - **`Timeline`**:
    - newest first;
    - each row: status icon + colour (running spinner respects reduced motion; waiting = "Waiting for you" with the prompt), tool name, origin chip (devtools/agent), relative time, and a duration bar scaled to `max(duration)` across visible rows (pure CSS width %, tabular numerals);
    - yield markers rendered as thin rows ("You took over").
    - Expand (disclosure) → `CallDetail`.
    - "Clear" button; empty state "No calls yet. Run a tool from the Tools tab, or let an agent call one."
  - **`CallDetail`**: args (`JsonView`), field fills (field → value with timestamps), result content (text parts rendered as text, others as JSON), error, and Re-run (prefills the runner with these args).
  - **`JsonView`**: a `<pre>` with `JSON.stringify(v, null, 2)`, collapsible above 30 lines, plus a copy button.
  - **`Settings`**:
    - Spotlight / Yield-to-user switches (`role="switch"`), disabled with an explanation when `visuals` is null;
    - dock position;
    - "Reset layout".
- **GOTCHA**:
  - Keyboard shortcuts: check `e.composedPath()[0]` so typing inside the panel's own inputs doesn't trigger page-level shortcuts, and vice versa.
  - Don't re-render the timeline on every fill: select per-component slices with `useSyncExternalStore(store.subscribe, () => store.getSnapshot().calls)`.
- **VALIDATE**: `pnpm --filter @web-agents/devtools typecheck`

### 11. CREATE `vanilla.tsx` + `index.ts`

- **IMPLEMENT**:
  - `installWebAgentsDevtools({ visuals?, initialOpen?, hotkey?, eventClient? = true }: DevtoolsOptions = {}): () => void`:
    - guard `typeof document === "undefined"` → noop;
    - `const store = createDevtoolsStore({ visuals })`;
    - create a host container, `createRoot(container).render(<ShadowHost><Panel store={store}/></ShadowHost>)`;
    - if `eventClient`, `bridgeStoreToEventClient(store)`;
    - return a disposer that unmounts, `store.destroy()` and removes the host.
  - Idempotent: a second call returns the first disposer, with a dev warning.
  - `index.ts` exports `installWebAgentsDevtools`, `createDevtoolsStore`, the types `DevtoolsOptions` / `DevtoolsState` / `CallRecord`, and `SchemaForm`/`defaultValueFor` (useful elsewhere, e.g. Phase 5 chat tool cards).
  - **Backward compatibility:** keep `installAgentConsole` exported as a deprecated alias that calls `installWebAgentsDevtools({ visuals: spotlight ? { setSpotlight: spotlight.set } : undefined })`, then delete `console.ts`.
- **VALIDATE**: `pnpm --filter @web-agents/devtools build && ls packages/devtools/dist/index.mjs packages/devtools/dist/react.mjs`

### 12. CREATE `event-client.ts`

- **IMPLEMENT**:
  ```ts
  import { EventClient } from "@tanstack/devtools-event-client";
  type WebAgentsEvents = { "state": Pick<DevtoolsState, "tools" | "calls">; "agent-event": AgentEvent };
  class WebAgentsEventClient extends EventClient<WebAgentsEvents> { constructor() { super({ pluginId: "web-agents" }); } }
  export const webAgentsEventClient = new WebAgentsEventClient();
  export function bridgeStoreToEventClient(store): () => void  // emits "state" (throttled to 1/animation frame) and forwards onAgentEvent
  ```
- **GOTCHA**:
  - The event names may be auto-prefixed with the `pluginId` (`web-agents:state`). Check the docs for whether `emit` takes the bare or the prefixed key, and match the type map accordingly.
  - Throttle with rAF. Large states over the bus are expensive.
- **VALIDATE**: `pnpm --filter @web-agents/devtools typecheck`

### 13. CREATE `react.tsx`

- **IMPLEMENT**:
  - `WebAgentsDevtools({ initialOpen, hotkey, visuals })`:
    - `const ctx = useOptionalWebAgents()`;
    - `const store = useMemo(() => createDevtoolsStore({ visuals: visuals ?? ctx?.visuals ?? null }), [])`;
    - destroy on unmount;
    - render `<ShadowHost><Panel store={store} …/></ShadowHost>`.
    - **StrictMode**: create the store in `useState` and destroy via a deferred cleanup (import `deferRelease` from core, Phase 2), so the double mount doesn't destroy the live store.
  - `webAgentsDevtoolsPlugin(options?)` returns the TanStack plugin object, `{ name: "Web Agents", render: <PluginPanel …/> }`. Verify the shape against the custom-plugins guide (it may be `render: (el, theme) => …`). `PluginPanel` renders `<ShadowHost inline>` with a `Panel` variant without its own launcher or dock (`embedded` prop), filling the TanStack container.
  - Export `useDevtoolsStore` for advanced users.
- **IMPORTS**: `useOptionalWebAgents` from `@web-agents/react` (add it there in this task: a 3-line `useContext` without the throw, exported from `packages/react/src/index.ts`).
- **VALIDATE**: `pnpm --filter @web-agents/devtools typecheck && pnpm --filter @web-agents/react typecheck`

### 14. CREATE UI tests

- `ui/Panel.browser.test.tsx` (polyfill + visuals; fixture tools as in Task 7):
  1. The launcher opens the panel, and focus moves to the active tab.
  2. Tools tab: search filters rows.
  3. Expand `add_to_cart_x` → a number input labelled `qty` prefilled with 1. Set it to 3, Run → the result text appears, and the Timeline badge shows the call.
  4. Toggle to JSON, type invalid JSON → `aria-invalid` with an error. Fix it → Run works.
  5. Copy as code → `navigator.clipboard.readText()` (grant permission in the browser-mode config, or stub `writeText` with `vi.spyOn`) contains `await agent.run("add_to_cart_x"`.
  6. Moving the real pointer over the panel during a run doesn't hide the agent cursor (`.agent-cursor.is-visible` remains).
  7. Keyboard: Tab through the tabs, arrow keys switch tabs (ARIA tabs), and `Escape` closes.
- `react.browser.test.tsx`:
  1. `<WebAgentsProvider visuals={{spotlight:false}}><WebAgentsDevtools initialOpen/></WebAgentsProvider>` in StrictMode → exactly one `[data-web-agents-ui]` host. The Settings Spotlight switch toggles `.agent-spotlight` usage (assert that `visuals.setSpotlight` was called via a spy on the context value, or assert the DOM class after a run).
  2. `<TanStackDevtools plugins={[webAgentsDevtoolsPlugin()]} />` renders without throwing, and the "Web Agents" tab label exists (open the TanStack shell programmatically per its docs if needed).
- **VALIDATE**: `pnpm --filter @web-agents/devtools test`

### 15. UPDATE `apps/playground/src/main.tsx` and `App.tsx`

- **IMPLEMENT**:
  - Remove the `installAgentConsole` block (`src/main.tsx:28-34` equivalent).
  - In `App` (inside `WebAgentsProvider`), render `{import.meta.env.DEV && <LazyDevtools />}`, where `LazyDevtools = lazy(() => import("@web-agents/devtools/react").then(m => ({ default: () => <m.WebAgentsDevtools /> })))`. That keeps it out of the production bundle.
  - Add an `?tanstack` query flag demo: when present, render `<TanStackDevtools plugins={[webAgentsDevtoolsPlugin()]} />` instead (also DEV-only, lazy).
  - Add `@web-agents/devtools` and `@tanstack/react-devtools` as playground devDependencies.
  - Remove any `.agent-console` styles from `apps/playground/src/app.css` (grep for `agent-console`).
- **GOTCHA**: `import.meta.env.DEV` must guard the dynamic `import()` expression itself, so Rolldown tree-shakes it from `vite build`. Verify with `grep -r "web-agents-devtools" apps/playground/dist` → no match.
- **VALIDATE**: `pnpm --filter playground typecheck && pnpm --filter playground build && ! grep -rq "Web Agents devtools" apps/playground/dist && echo "devtools excluded from prod"`

### 16. UPDATE docs

- **IMPLEMENT**:
  - `packages/devtools/README.md`: the three hosts, options, hotkey, production exclusion, the TanStack plugin snippet, limitations (call correlation by tool name; Cancel only with the polyfill).
  - Root `README.md`: replace "open the Agent console" wording (README line 8, and the "Trying it" steps) with the devtools.
  - Delete `packages/devtools/src/console.ts` if not already done.
- **VALIDATE**: `pnpm lint`

---

## TESTING STRATEGY

### Unit Tests

Node project. Covers:
- `defaults.ts`;
- `coerce.ts`;
- `copy-as-code.ts`;
- `execute.ts` `normalizeResult`/`parseSchema`/`isFailure` (pure, table-driven with `it.each`);
- the arg-shape fallback, with a fake `mc` whose `executeTool` throws the Chrome-150 message once.

### Integration Tests

Browser project (chromium), using the polyfill + visuals + real DOM:
- store aggregation;
- Shadow-DOM UI behaviour;
- React host + StrictMode;
- TanStack plugin smoke;
- `userEvent` for trusted input.

### Edge Cases

- Chrome-shaped `getTools()` (string `inputSchema`) and polyfill-shaped (object): both render forms.
- `executeTool` resolves `null` (navigation): shown as "(navigated)", status ok.
- A declarative tool returning `"Error: …"` text → status error (red), not ok.
- 200+ calls → capped, oldest dropped, no jank (the timeline keeps rendering fast; a `content-visibility: auto` row style is acceptable).
- A tool unregistered while its runner is open → the runner shows "This tool is no longer registered" and Run is disabled.
- No `document.modelContext` → the unsupported state; no throw.
- `localStorage` unavailable (Safari private mode) → defaults, no throw.
- Panel interaction during an agent run doesn't trigger yield-to-user.
- Reduced motion: no spinner rotation, no transitions.
- Dark mode: tokens switch; contrast ≥ 4.5:1 for text (check with the `a11y` skill).

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm lint
pnpm typecheck
```

### Level 2: Unit Tests

```bash
pnpm --filter @web-agents/devtools test -- --project node
```

### Level 3: Integration Tests

```bash
pnpm --filter @web-agents/devtools test
pnpm --filter @web-agents/core test          # user-yield exclusion
pnpm test && pnpm build
```

### Level 4: Manual Validation

`pnpm --filter playground dev`, then use the `agent-browser` skill:

1. `agent-browser open http://localhost:5173`, then press `Alt+Shift+A` → the panel opens. Snapshot: tabs Tools/Timeline/Settings exist with correct roles.
2. Tools: expand `add_to_cart_mug-01`, set qty 3 via the form, Run → the cursor animates on the page while the panel stays sharp above the spotlight; the Timeline shows ok with duration and the `qty` fill.
3. `place_order` → Timeline shows "Waiting for you · Click "Place order…" to confirm". Click on the page → ok.
4. Copy as code → paste into the DevTools console → it runs.
5. Settings: toggle Spotlight off → the next run has no blur.
6. Reload: the panel's open/tab/size state persists.
7. `http://localhost:5173/?tanstack` → the TanStack shell shows a "Web Agents" tab with the same UI.
8. Take screenshots of the panel in light and dark (`agent-browser` emulate color scheme) for the PR.

### Level 5: Additional Validation (Optional)

- Run the `react-doctor` skill on `packages/devtools`.
- Run the `a11y` skill review on the panel.
- Run the `e2e-test` skill on the playground.

---

## ACCEPTANCE CRITERIA

- [ ] Panel lists live tools (`toolchange`), with kind/annotation badges, search, Locate
- [ ] Schema form covers string/enum/number/integer/boolean/object/array; JSON fallback with inline errors; synced Form ⇄ JSON
- [ ] Runner: Run (`Cmd/Ctrl+Enter`), Cancel (when supported), Copy as code (`agent.run` and `executeTool` snippets)
- [ ] Timeline merges devtools- and agent-originated calls with fills, waiting state, results, durations, yield markers
- [ ] Spotlight / yield toggles drive the visuals controller; layout persisted
- [ ] Three hosts work: `installWebAgentsDevtools()`, `<WebAgentsDevtools/>`, `webAgentsDevtoolsPlugin()` for TanStack
- [ ] Full style isolation (Shadow DOM); panel renders above the spotlight; no page CSS leaks either way
- [ ] Interacting with the panel never triggers cursor yield
- [ ] `window.agent.run/list` still work; `installAgentConsole` deprecated alias works; `console.ts` removed
- [ ] Devtools excluded from the playground production bundle
- [ ] Keyboard-operable, labelled controls, reduced-motion and dark-mode support
- [ ] All validation commands pass

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

- **UI framework decision**: React internally. It's a dev-only tool, the React host and TanStack plugin need React anyway, and one implementation serves all three hosts. The vanilla host costs the consumer a React peer; acceptable for a dev tool. If a non-React consumer appears, Preact via `preact/compat` aliasing is a drop-in later.
- **Why Shadow DOM + constructable stylesheet instead of a CSS file**: tsdown CSS support is experimental, and page styles (e.g. the playground's global `button` rules) would leak into the panel. A CSS-in-TS string has no bundler requirements.
- **Why not RJSF/JSON Forms**: WebMCP schemas are shallow, and those libraries cost 60–150 KB+ with ajv (roadmap decision).
- **Call correlation** is by tool name (core events have no call id). If Phase 5 needs exact correlation, extend `AgentEvent` with an optional `callId` in core (roadmap contract change) and prefer it here when present.
- **TanStack Devtools is 0.x**: everything TanStack-specific is isolated in `react.tsx` (plugin) and `event-client.ts`. If its API changes, only those two files move.
- **Cancel** is available only where `mc.cancelTool` exists (the polyfill). Native Chrome has no page-side cancel API today; the button is hidden, not just disabled, to avoid implying it.

**Confidence score: 7/10** for one-pass success. Uncertainties: the exact TanStack plugin `render` signature and the event-key prefixing (0.x API), vitest browser clipboard permissions, and correlation edge cases when the same tool runs concurrently.
