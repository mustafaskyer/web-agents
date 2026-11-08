# @web-agents/polyfill

A `document.modelContext` (WebMCP) polyfill for development and browsers without native
support. It steps aside when the browser has the real API.

```ts
import "@web-agents/polyfill/auto"; // or:
import { installWebMCPPolyfill } from "@web-agents/polyfill";
const modelContext = installWebMCPPolyfill();
```

- `registerTool(tool, { signal })`, `unregisterTool(name)`, `getTools()`, `executeTool(nameOrTool, args)`.
  `executeTool` accepts both its own `(name, object)` and Chrome's `(tool, JSON string)` shapes.
- Events on `document.modelContext`: `toolchange`, `toolactivated`, `toolcancel` (each with `.toolName`).
- Declarative `<form toolname …>` tools, found with a MutationObserver: input schema from the
  controls (`toolparamdescription` or the `<label>` describes each parameter), `toolautosubmit`,
  and the confirmation pause, mirrored as `data-tool-form-active` / `data-tool-submit-active`
  (a polyfill can't define the native `:tool-form-active` / `:tool-submit-active` pseudo-classes).
- `SubmitEvent.agentInvoked` and `respondWith(promise)`.
- `executeTool(name, args, { signal })`: aborting the signal cancels the call (toolcancel fires, the
  tool's own signal aborts), as in Chrome.
- Non-standard `cancelTool(name)`, so dev tooling can cancel a call it didn't start.

Event order differs from Chrome: the polyfill fires `toolactivated → fill → submit`,
native Chrome `fill → submit → toolactivated`. `@web-agents/core` handles both.
