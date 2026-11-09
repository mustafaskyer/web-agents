# `installWebMCPPolyfill`

Installs a `document.modelContext` polyfill unless the browser already has one, and returns whichever `ModelContext` is active. Use it in development and in browsers without native WebMCP, so tools register and the agent cursor can be exercised.

```ts
import { installWebMCPPolyfill } from "@webmcp-agents/polyfill";
```

## Signature

```ts
function installWebMCPPolyfill(): ModelContext | undefined;
```

## Parameters

—

## Returns

`ModelContext | undefined`:

- The native `document.modelContext` when the browser has one. Nothing is installed.
- Otherwise a new [`PolyfillModelContext`](./polyfill-model-context.md), defined on `document` as `modelContext` (configurable).
- `undefined` on the server (no `document`).

## What it installs

- `document.modelContext`: a `PolyfillModelContext` with `registerTool`, `unregisterTool`, `getTools`, `executeTool` (with `{ signal }`), the non-standard `cancelTool`, and the `toolchange`, `toolactivated` and `toolcancel` events.
- Declarative `<form toolname>` tools, found on install and with a MutationObserver on `document.documentElement`, including `toolautosubmit` and the confirmation pause (mirrored as `data-tool-form-active` / `data-tool-submit-active`).
- `SubmitEvent.agentInvoked` and `respondWith(promise)` on the agent's submit.

It logs `[webmcp-polyfill] document.modelContext installed (dev only)` once.

## Example

Call it before any tool registers:

```ts
import { installWebMCPPolyfill } from "@webmcp-agents/polyfill";

const modelContext = installWebMCPPolyfill();
```

The example apps use the side-effect entry instead, in development only, before importing the app (`apps/ecommerce/src/main.tsx`):

```ts
// 1. (dev only) give browsers without native WebMCP a document.modelContext, before any tool registers.
if (import.meta.env.DEV) await import("@webmcp-agents/polyfill/auto");

// 2. the app: <WebAgentsProvider> in Root installs the agent cursor before its first tool registers.
const { routes } = await import("./routes");
```

## Notes

- Safe to call more than once: later calls return the installed instance.
- It steps aside when the browser has the real API. In a WebMCP-enabled Chrome you get Chrome's behaviour, including its event order and its cancelling of calls whose tool changes.
- Install it before tools register. `registerWebTool` without `document.modelContext` warns once and registers nothing, and it doesn't retry later.
- The declarative-form observer is never disconnected.
- `@webmcp-agents/core` is an optional peer dependency, used for types only.

## See also

- [`PolyfillModelContext`](./polyfill-model-context.md)
- [`@webmcp-agents/polyfill/auto`](./auto.md)
- [`isWebMCPAvailable`](../core/is-webmcp-available.md)
- [`WebAgentsProvider`](../react/web-agents-provider.md)
